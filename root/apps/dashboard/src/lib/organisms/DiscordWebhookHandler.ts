/**
 * ORGANISM: DiscordWebhookHandler
 * Responsabilidade: Processa webhooks do Discord via Engine data-driven
 * Orquestra: Engine, Session, dc-handle-interaction, dc-verify-signature
 */

import { dcHandleInteraction, InteractionType, type DiscordInteraction } from '../atoms/discord'
import { dbGetBotById } from '../atoms/database'
import { executeFromTrigger, type FlowExecutionResult } from '../../core/engine'
import { getBlueprintByTriggerFromKv } from '../molecules/kv-blueprint-manager'
import type {
    UniversalContext,
    Env,
    DiscordCredentials
} from '../../core/types'

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
        console.log('[DEBUG] Discord Interaction:', JSON.stringify(interaction))

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

        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            response = {
                type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                data: {
                    content: '🔄 Processando...',
                    flags: 64 // EPHEMERAL: Only the user who triggered sees this
                }
            }
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
                    return await executeFromTrigger(
                        {
                            blueprints: context.env.BLUEPRINTS_KV,
                            sessions: context.env.SESSIONS_KV,
                        },
                        ctx
                    )
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
