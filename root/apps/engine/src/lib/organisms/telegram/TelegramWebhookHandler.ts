/**
 * ORGANISM: TelegramWebhookHandler
 * Responsabilidade: Processa webhooks do Telegram via Engine data-driven
 * Orquestra: Engine, Session, tg-handle-update, Analytics
 * 
 * REFACTORED: All command logic moved to Blueprint JSONs
 */

import { tgHandleUpdate, type TelegramUpdate } from '../../atoms'
import { dbGetBotById } from '../../atoms'
import { dbLogAnalyticsEvent } from '../../atoms'
import { executeFromTrigger, type FlowExecutionResult } from '../'
import { getBlueprintByTriggerFromKv, getBlueprintFromKv } from '../../molecules'
import type {
    TelegramCredentials,
    UniversalContext,
    Env
} from '../../../core/types'

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
                    stepsExecuted: flowResult.stepsExecuted
                }
            })
        }
    } catch (error) {
        // Don't fail the webhook if analytics logging fails
        console.error('[Analytics] Error logging flow analytics:', error)
    }
}

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
// CONTEXT BUILDER
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
// MAIN WEBHOOK HANDLER
// ============================================

/**
 * Handle incoming Telegram webhook - Data-driven
 */
export async function handleTelegramWebhook(
    update: TelegramUpdate,
    context: WebhookContext
): Promise<WebhookResult> {
    try {
        // 1. Get bot credentials
        const bot = await dbGetBotById({ db: context.env.DB, id: context.botId })
        if (!bot) {
            return {
                handled: false,
                error: 'Bot not found'
            }
        }

        const credentials = bot.credentials as TelegramCredentials
        const token = credentials.token

        // 2. Build UniversalContext
        const ctx = buildUniversalContext(update, context.tenantId, token, context.env.DB, context.botId)

        if (!ctx) {
            return { handled: false }
        }

        // 3. Try to get the blueprintId for analytics (before execution for starting flows)
        let blueprintId = 'unknown'
        if (ctx.metadata.command) {
            const trigger = `/${ctx.metadata.command}`
            const bpResult = await getBlueprintByTriggerFromKv(context.env.BLUEPRINTS_KV, context.tenantId, trigger)
            if (bpResult.success && bpResult.data) {
                blueprintId = bpResult.data.id
            }
        }

        // 4. Run Engine
        const result = await executeFromTrigger(
            {
                blueprints: context.env.BLUEPRINTS_KV,
                sessions: context.env.SESSIONS_KV,
            },
            ctx
        )

        // Update blueprintId from execution result if available
        if (result.blueprintId) {
            blueprintId = result.blueprintId
        }

        // 5. Log analytics events
        if (blueprintId !== 'unknown') {
            await logFlowAnalytics(
                context.env.DB,
                context.tenantId,
                context.botId,
                blueprintId,
                String(ctx.userId),
                result
            )
        }

        return {
            handled: true,
            flowResult: result
        }
    } catch (error) {
        console.error('[Telegram Handler] Error:', error)
        return {
            handled: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

// Wrapper for index export
export const TelegramWebhookHandler = {
    handle: handleTelegramWebhook
}
