/**
 * WEBHOOKS ROUTES
 * Handles incoming webhook events from Telegram, Discord, etc.
 * Follows SRP - Single Responsibility for webhook processing
 */

import { Hono } from 'hono'
import type { Env, TelegramCredentials } from '../core/types'
import { dbGetBotById } from '../lib/atoms/database'
import { handleTelegramWebhook } from '../lib/organisms/TelegramWebhookHandler'
import type { TelegramUpdate } from '../lib/atoms/telegram'

const webhooksRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// TELEGRAM WEBHOOK
// ============================================

webhooksRoutes.post('/webhooks/telegram/:botId', async (c) => {
    const botId = c.req.param('botId')
    const webhookSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token')

    // Get bot from database
    const bot = await dbGetBotById({ db: c.env.DB, id: botId })

    if (!bot) {
        return c.json({ error: 'Bot not found' }, 404)
    }

    // Verify webhook secret
    if (bot.webhookSecret && bot.webhookSecret !== webhookSecret) {
        return c.json({ error: 'Invalid secret' }, 401)
    }

    try {
        const update = await c.req.json<TelegramUpdate>()

        await handleTelegramWebhook(update, {
            env: c.env,
            botId,
            tenantId: bot.tenantId,
        })

        return c.json({ ok: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return c.json({ ok: true }) // Always return 200 to Telegram
    }
})

// ============================================
// DISCORD WEBHOOK (Future)
// ============================================

webhooksRoutes.post('/webhooks/discord/:botId', async (c) => {
    // Discord webhook implementation
    return c.json({ ok: true, message: 'Discord webhook not yet implemented' })
})

export { webhooksRoutes }
