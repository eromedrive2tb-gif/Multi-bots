/**
 * WEBHOOKS ROUTES
 * Handles incoming webhook events from Telegram, Discord, etc.
 * Follows SRP - Single Responsibility for webhook processing
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { WebhookService } from '../lib/organisms/WebhookService'
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
// DISCORD WEBHOOK (Future)
// ============================================

webhooksRoutes.post('/webhooks/discord/:botId', async (c) => {
    // Discord webhook implementation
    return c.json({ ok: true, message: 'Discord webhook not yet implemented' })
})

export { webhooksRoutes }
