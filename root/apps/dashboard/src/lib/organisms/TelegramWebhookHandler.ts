/**
 * ORGANISM: TelegramWebhookHandler
 * Responsabilidade: Processa webhooks do Telegram via Engine data-driven
 * Orquestra: Engine, Session, tg-handle-update, Analytics
 * 
 * REFACTORED: All command logic moved to Blueprint JSONs
 */

import { tgHandleUpdate, type TelegramUpdate } from '../atoms/telegram'
import { dbGetBotById } from '../atoms/database'
import { dbLogAnalyticsEvent } from '../atoms/database/db-log-analytics'
import { executeFromTrigger, type FlowExecutionResult } from '../../core/engine'
import { getBlueprintByTriggerFromKv, getBlueprintFromKv } from '../molecules/kv-blueprint-manager'
import type {
    TelegramCredentials,
    UniversalContext,
    Env
} from '../../core/types'

// ============================================
// WEBHOOK CONTEXT
// ============================================

export interface WebhookContext {
    env: Env
    botId: string
    tenantId: string
}

export interface WebhookResult {
    handled: boolean
    flowResult?: FlowExecutionResult
    error?: string
}

// ============================================
// UPDATE TO CONTEXT CONVERTER
// ============================================


/**
 * Converts a Telegram update to UniversalContext
 */
function buildUniversalContext(
    update: TelegramUpdate,
    tenantId: string,
    botToken: string,
    db: D1Database,
    botId: string
): UniversalContext | null {
    const parsed = tgHandleUpdate(update)

    if (!parsed.message) {
        return null
    }

    return {
        provider: 'tg',
        tenantId,
        userId: parsed.message.from.id,
        chatId: parsed.message.chatId,
        botToken,
        botId,
        db,
        metadata: {
            userName: parsed.message.from.name,
            lastInput: parsed.message.text,
            command: parsed.isCommand ? parsed.command : undefined,
            raw: update,
        },
    }
}

// ============================================
// ANALYTICS LOGGING HELPER
// ============================================

/**
 * Log analytics events after flow execution
 */
async function logFlowAnalytics(
    db: D1Database,
    tenantId: string,
    botId: string,
    blueprintId: string,
    userId: string,
    flowResult: FlowExecutionResult
): Promise<void> {
    try {
        // Log flow_complete event
        if (flowResult.success && flowResult.stepsExecuted > 0 && !flowResult.lastStepId) {
            // Flow completed (reached null next_step)
            await dbLogAnalyticsEvent({
                db,
                tenantId,
                botId,
                blueprintId,
                stepId: 'flow_complete',
                userId,
                eventType: 'flow_complete',
                eventData: {
                    stepsExecuted: flowResult.stepsExecuted,
                }
            })
        }

        // Log flow error if present
        if (flowResult.error) {
            await dbLogAnalyticsEvent({
                db,
                tenantId,
                botId,
                blueprintId,
                stepId: flowResult.lastStepId || 'unknown',
                userId,
                eventType: 'step_error',
                eventData: {
                    error: flowResult.error,
                    stepsExecuted: flowResult.stepsExecuted,
                }
            })
        }
    } catch (error) {
        // Don't fail the webhook if analytics logging fails
        console.error('[Analytics] Error logging flow analytics:', error)
    }
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

/**
 * Handle incoming Telegram webhook - now fully data-driven
 * All command logic is defined in Blueprint JSONs
 */
export async function handleTelegramWebhook(
    update: TelegramUpdate,
    context: WebhookContext
): Promise<WebhookResult> {
    try {
        // Get bot credentials
        const bot = await dbGetBotById({ db: context.env.DB, id: context.botId })

        if (!bot) {
            return {
                handled: false,
                error: 'Bot not found'
            }
        }

        const token = (bot.credentials as TelegramCredentials).token

        // Build UniversalContext from update
        const ctx = buildUniversalContext(update, context.tenantId, token, context.env.DB, context.botId)

        if (!ctx) {
            // Non-message update (e.g., edited_message, callback_query)
            // Can be extended to handle these in the future
            return { handled: false }
        }

        // Try to get the blueprintId for analytics
        let blueprintId = 'unknown'
        if (ctx.metadata.command) {
            const trigger = `/${ctx.metadata.command}`
            const bpResult = await getBlueprintByTriggerFromKv(context.env.BLUEPRINTS_KV, context.tenantId, trigger)
            if (bpResult.success && bpResult.data) {
                blueprintId = bpResult.data.id
            }
        }

        // Execute flow via Engine
        const flowResult = await executeFromTrigger(
            {
                blueprints: context.env.BLUEPRINTS_KV,
                sessions: context.env.SESSIONS_KV,
            },
            ctx
        )

        // Log analytics events
        await logFlowAnalytics(
            context.env.DB,
            context.tenantId,
            context.botId,
            blueprintId,
            String(ctx.userId),
            flowResult
        )

        return {
            handled: flowResult.success || flowResult.stepsExecuted > 0,
            flowResult,
        }
    } catch (error) {
        return {
            handled: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

// ============================================
// LEGACY COMMAND HANDLER (Deprecated)
// ============================================

/**
 * @deprecated Use handleTelegramWebhook with Engine instead
 * Kept for backward compatibility during migration
 */
export async function handleTelegramWebhookLegacy(
    update: TelegramUpdate,
    context: WebhookContext & { userName: string; db: D1Database }
): Promise<{ handled: boolean; command?: string; response?: string }> {
    console.warn('handleTelegramWebhookLegacy is deprecated. Migrate to Blueprint-based flows.')

    // Forward to new handler
    const result = await handleTelegramWebhook(update, {
        env: {
            DB: context.db,
            AUTH_SECRET: '',
            BLUEPRINTS_KV: undefined as unknown as KVNamespace,
            SESSIONS_KV: undefined as unknown as KVNamespace,
        },
        botId: context.botId,
        tenantId: context.tenantId,
    })

    return {
        handled: result.handled,
        command: undefined,
        response: result.error,
    }
}
