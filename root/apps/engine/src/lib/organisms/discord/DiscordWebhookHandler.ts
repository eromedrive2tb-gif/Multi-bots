/**
 * ORGANISM: DiscordWebhookHandler
 * Responsabilidade: Processa webhooks do Discord via Engine data-driven
 * Orquestra: Engine, Session, dc-handle-interaction, dc-verify-signature
 */

import { dcHandleInteraction, InteractionType, type DiscordInteraction } from '../../atoms'
import { dbGetBotById } from '../../atoms'
import { dbLogAnalyticsEvent } from '../../atoms'
import { executeFromTrigger, type FlowExecutionResult } from '../'
import { getBlueprintByTriggerFromKv } from '../../molecules'
import type {
    UniversalContext,
    Env,
    DiscordCredentials,
} from '../../../core/types'
import { ErrorSeverity } from '../../../core/analytics-types'

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
            let severity = ErrorSeverity.CRITICAL // Default to Level 4

            if (typeof flowResult.error === 'string' && flowResult.error.includes('Command trigger mismatch')) {
                severity = ErrorSeverity.LOW
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
        console.error('[Analytics] Error logging flow analytics:', error)
    }
}

// ============================================
// WEBHOOK CONTEXT
// ============================================

export interface DiscordWebhookContext {
    env: Env
    botId: string
    tenantId: string
    bot?: any
}

export interface DiscordWebhookResult {
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
    parsed: ReturnType<typeof dcHandleInteraction>,
    interaction: DiscordInteraction,
    tenantId: string,
    botToken: string,
    db: D1Database,
    botId: string
): UniversalContext | null {

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
    context: DiscordWebhookContext
): Promise<DiscordWebhookResult> {
    try {
        // 1. Handle PING immediately
        if (interaction.type === InteractionType.PING) {
            return {
                handled: true,
                response: { type: 1 } // PONG
            }
        }

        // 2. Get bot credentials
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

        // 3. Parse Interaction (Unify logic)
        const parsed = dcHandleInteraction(interaction)
        const ctx = buildUniversalContext(parsed, interaction, context.tenantId, token, context.env.DB, context.botId)

        if (!ctx) {
            return { handled: false }
        }

        // 4. Determine Response Content
        let response: any = { type: 5 } // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE

        if (interaction.type === InteractionType.MODAL_SUBMIT) {
            response = { type: 6 } // DEFERRED_UPDATE_MESSAGE
        }

        if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
            const customId = parsed.customId || ''

            if (customId && customId.startsWith('CIV_')) {
                const variableName = customId.replace('CIV_', '')
                response = {
                    type: 9, // MODAL
                    data: {
                        title: 'Responder',
                        custom_id: `SUBMIT_${variableName}`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 4,
                                        custom_id: 'input_value',
                                        label: 'Sua resposta:',
                                        style: 1,
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
                response = { type: 6 }
            }
        }

        // 5. Engine Execution Promise (Detached)
        let executionPromise: Promise<any> | undefined

        if (response && response.type !== 9) {
            executionPromise = (async () => {
                try {
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

                    if (result.blueprintId) {
                        blueprintId = result.blueprintId
                    }

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

export const DiscordWebhookHandler = {
    handle: handleDiscordWebhook
}
