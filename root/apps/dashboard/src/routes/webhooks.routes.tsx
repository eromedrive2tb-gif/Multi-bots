/**
 * WEBHOOKS ROUTES
 * Handles incoming webhook events from Telegram, Discord, etc.
 * Follows SRP - Single Responsibility for webhook processing
 */

import { Hono } from 'hono'
import { DiscordHono } from 'discord-hono'
import type { Env, DiscordCredentials } from '../core/types'
import { WebhookService } from '../lib/organisms/WebhookService'
import { dbGetBotById } from '../lib/atoms/database'
import { handleDiscordWebhook } from '../lib/organisms/DiscordWebhookHandler'
import type { TelegramUpdate } from '../lib/atoms/telegram'

const webhooksRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// TELEGRAM WEBHOOK
// ============================================

webhooksRoutes.post('/webhooks/telegram/:botId', async (c) => {
    const botId = c.req.param('botId')
    const webhookSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token')

    try {
        const update = await c.req.json<TelegramUpdate>()
        const webhookService = new WebhookService(c.env.DB, c.env)

        const result = await webhookService.processTelegramWebhook(botId, webhookSecret, update)

        if (!result.success) {
            return c.json({ error: result.error }, result.status as any)
        }

        return c.json({ ok: true })
    } catch (error) {
        console.error('Webhook route error:', error)
        return c.json({ ok: true }) // Always return 200 to Telegram
    }
})

// ============================================
// DISCORD WEBHOOK (Using discord-hono)
// ============================================

webhooksRoutes.post('/webhooks/discord/:botId', async (c) => {
    const botId = c.req.param('botId')

    // 1. Get bot credentials from DB first
    const bot = await dbGetBotById({ db: c.env.DB, id: botId })
    if (!bot) {
        return c.json({ error: 'Bot not found' }, 404)
    }

    const credentials = bot.credentials as DiscordCredentials

    // 2. Initialize DiscordHono for this specific bot
    const discord = new DiscordHono({
        discordEnv: () => ({
            TOKEN: credentials.token,
            PUBLIC_KEY: credentials.publicKey,
            APPLICATION_ID: credentials.applicationId,
        })
    })

    // 3. Define handlers that delegate to our DiscordWebhookHandler
    // discord-hono will handle the signature verification and PING/PONG automatically

    // 3. Define handlers that delegate to our DiscordWebhookHandler
    // discord-hono will handle the signature verification and PING/PONG automatically

    // Catch-all for commands - Guaranteed fast response
    discord.command('', async (ctx) => {
        // Schedule heavy processing for AFTER the response is sent
        c.executionCtx.waitUntil((async () => {
            try {
                const result = await handleDiscordWebhook(ctx.interaction as any, {
                    env: c.env,
                    botId: bot.id,
                    tenantId: bot.tenantId,
                    bot
                })
                if (result.executionPromise) {
                    await result.executionPromise
                }
            } catch (err) {
                console.error('[Discord Async Command Error]:', err)
            }
        })())

        // Immediate ACK: Discord will show this message while we process
        return ctx.res('🔄 Processando sua solicitação...')
    })

    // Catch-all for components (buttons, select menus)
    discord.component('', async (ctx) => {
        try {
            // Check if this is a "Collect Input" button click
            if (ctx.interaction.data && 'custom_id' in ctx.interaction.data) {
                const customId = ctx.interaction.data.custom_id
                if (customId.startsWith('CIV_')) {
                    const variableName = customId.replace('CIV_', '')
                    return ctx.resModal({
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
                                        style: 1, // Short
                                        min_length: 1,
                                        max_length: 2000,
                                        required: true,
                                        placeholder: 'Digite sua resposta aqui...'
                                    }
                                ]
                            }
                        ]
                    })
                }
            }

            const result = await handleDiscordWebhook(ctx.interaction as any, {
                env: c.env,
                botId: bot.id,
                tenantId: bot.tenantId,
                bot
            })

            if (result.executionPromise) {
                c.executionCtx.waitUntil(result.executionPromise)
            }

            if (result.response) {
                if (result.response.type === 5 || result.response.type === 6) {
                    return ctx.resDefer()
                }
                return ctx.res(result.response.data || result.response)
            }

            return ctx.resDefer()
        } catch (err) {
            console.error('[Discord Component Route Error]:', err)
            return ctx.resDefer()
        }
    })
    // Catch-all for other types to avoid 404
    discord.modal('', (ctx) => ctx.resDefer())
    discord.autocomplete('', (ctx) => ctx.resAutocomplete({ choices: [] } as any))

    // 4. Let discord-hono handle the request (including signature verification)
    return discord.fetch(c.req.raw, c.env, c.executionCtx)
})

export { webhooksRoutes }
