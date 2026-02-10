/**
 * ORGANISM: DiscordWebhookHandler
 * Responsabilidade: Processa webhooks do Discord via Engine data-driven
 * Orquestra: Engine, Session, dc-handle-interaction, dc-verify-signature
 */

import { dcHandleInteraction, InteractionType, type DiscordInteraction, dcSendMessage } from '../atoms/discord'
import { dbGetBotById } from '../atoms/database'
import { dbLogAnalyticsEvent } from '../atoms/database/db-log-analytics' // NEW
import { executeFromTrigger, type FlowExecutionResult } from '../../core/engine'
import { getBlueprintByTriggerFromKv } from '../molecules/kv-blueprint-manager'
import type {
    UniversalContext,
    Env,
    DiscordCredentials, // Added comma just in case
} from '../../core/types'
import { ErrorSeverity } from '../../core/analytics-types'

// ... (Context definitions) ...

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
            // Determine Severity
            let severity = ErrorSeverity.CRITICAL // Default to Level 4 (Critical/Unknown)

            if (typeof flowResult.error === 'string' && flowResult.error.includes('Command trigger mismatch')) {
                severity = ErrorSeverity.LOW // Level 1 (User Error)
            }

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
                    severity: severity
                }
            })
        }
    } catch (error) {
        // Don't fail the webhook if analytics logging fails
        console.error('[Analytics] Error logging flow analytics:', error)
    }
}

// ... (Context Builder) ...

// Main Handler ...


// ============================================
// WEBHOOK CONTEXT
// ============================================

export interface WebhookContext {
    env: Env
    botId: string
    tenantId: string
    bot?: any // Pre-fetched bot object to save time
}

export interface WebhookResult {
    handled: boolean
    response?: any
    flowResult?: FlowExecutionResult
    executionPromise?: Promise<any>
    error?: string
}

// ============================================
// CONTEXT BUILDER
// ============================================

/**
 * Converts a Discord interaction to UniversalContext
 */
function buildUniversalContext(
    interaction: DiscordInteraction,
    tenantId: string,
    botToken: string,
    db: D1Database,
    botId: string
): UniversalContext | null {
    const parsed = dcHandleInteraction(interaction)

    if (!parsed.message) {
        return null
    }

    return {
        provider: 'dc',
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
            raw: interaction,
        },
    }
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================



/**
 * Handle incoming Discord webhook - Data-driven
 */
export async function handleDiscordWebhook(
    interaction: DiscordInteraction,
    context: WebhookContext
): Promise<WebhookResult> {
    try {


        // ... rest of function ...

        // Inside executionPromise:
        // logDebug('Starting Engine execution...')
        // const result = await executeFromTrigger(...)
        // logDebug(`Engine finished: Success=${result.success} Steps=${result.stepsExecuted}`)

        // 1. Handle PING immediately (Discord requirement)
        if (interaction.type === InteractionType.PING) {
            return {
                handled: true,
                response: { type: 1 } // PONG
            }
        }

        // 2. Get bot credentials (use pre-fetched if available)
        let bot = context.bot
        if (!bot) {
            bot = await dbGetBotById({ db: context.env.DB, id: context.botId })
        }

        if (!bot) {
            return {
                handled: false,
                error: 'Bot not found'
            }
        }

        const credentials = bot.credentials as DiscordCredentials
        const token = credentials.token

        // 3. Build UniversalContext
        const ctx = buildUniversalContext(interaction, context.tenantId, token, context.env.DB, context.botId)

        if (!ctx) {
            return { handled: false }
        }

        // 4. Determine Response Content (Immediate ACK to avoid 3s timeout)
        let response: any = { type: 5 } // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE

        // SILENT ACK for Modals to prevent "Bot is thinking..." spam
        if (interaction.type === InteractionType.MODAL_SUBMIT) {
            response = { type: 6 } // DEFERRED_UPDATE_MESSAGE
        }

        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            // Use standard Defer (Thinking...). 
            // NOTE: It will persist until timeout since we send NEW messages instead of Editing.
            // But user finds "Processando..." text polluting.
            response = { type: 5 }
        } else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
            const data = interaction.data as any
            let customId = data?.custom_id || data?.customId || (interaction as any).customId || ''

            // Fallback: Scan entire object if not found (Ultra-robust)
            if (!customId || !customId.startsWith('CIV_')) {
                const raw = JSON.stringify(interaction)
                const match = raw.match(/"custom_id":"(CIV_[^"]+)"/)
                if (match) {
                    customId = match[1]
                }
            }

            if (customId && customId.startsWith('CIV_')) {
                // Handle "Collect Input" Button -> Open Modal
                const variableName = customId.replace('CIV_', '')
                response = {
                    type: 9, // MODAL
                    data: {
                        title: 'Responder',
                        custom_id: `SUBMIT_${variableName}`,
                        components: [
                            {
                                type: 1, // Action Row
                                components: [
                                    {
                                        type: 4, // Text Input
                                        custom_id: 'input_value',
                                        label: 'Sua resposta:',
                                        style: 1, // Short
                                        min_length: 1,
                                        max_length: 2000,
                                        required: true,
                                        placeholder: 'Digite sua resposta aqui...'
                                    }
                                ]
                            }
                        ]
                    }
                }
            } else {
                response = { type: 6 } // DEFERRED_UPDATE_MESSAGE
            }
        }

        // 5. Build Engine Execution Promise (Detached)
        // ONLY execute if it's NOT a modal (type 9)
        // The modal button click is just UI, NOT engine input.
        let executionPromise: Promise<any> | undefined

        // FIX: Ensure we check response type properly
        if (response && response.type !== 9) {
            executionPromise = (async () => {
                try {
                    // Try to get the blueprintId for analytics
                    let blueprintId = 'unknown'
                    if (ctx.metadata.command) {
                        const trigger = `/${ctx.metadata.command}`
                        const bpResult = await getBlueprintByTriggerFromKv(context.env.BLUEPRINTS_KV, context.tenantId, trigger)
                        if (bpResult.success && bpResult.data) {
                            blueprintId = bpResult.data.id
                        }
                    }

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

                    // Log analytics events
                    await logFlowAnalytics(
                        context.env.DB,
                        context.tenantId,
                        context.botId,
                        blueprintId,
                        String(ctx.userId),
                        result
                    )

                    return result
                } catch (e) {
                    const errMsg = e instanceof Error ? e.message : String(e)

                    console.error('[Discord Handler] Engine execution failed:', e)

                    return null
                }
            })()
        }

        return {
            handled: true,
            response,
            executionPromise
        }
    } catch (error) {
        console.error('[Discord Handler] Error:', error)
        return {
            handled: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}
