/**
 * BOTS ROUTES
 * Handles bot CRUD, health checks, and webhook management
 * Follows SRP - Single Responsibility for bot management
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Env, BotProvider, TelegramCredentials, DiscordCredentials } from '../core/types'
import { authMiddleware } from '../middleware/auth'
import { BotManagerService } from '../lib/organisms/BotManagerService'
// dbGetBots, dbGetBotById, tgSetWebhook removed as they are now used inside BotManagerService

// Pages
import { BotsPage } from '../pages/bots'

const botsRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// HELPER
// ============================================

function getBaseUrl(c: Context<{ Bindings: Env }>): string {
    // 1. Check for explicit WEBHOOK_BASE_URL env var (production)
    if (c.env.WEBHOOK_BASE_URL) {
        return c.env.WEBHOOK_BASE_URL.replace(/\/$/, '')
    }

    // 2. Try X-Forwarded headers
    const forwardedProto = c.req.header('X-Forwarded-Proto') || 'https'
    const forwardedHost = c.req.header('X-Forwarded-Host') || c.req.header('Host')

    if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`
    }

    // 3. Fallback to request URL origin
    return new URL(c.req.url).origin
}

// ============================================
// BOT API ENDPOINTS
// ============================================

// List all bots
botsRoutes.get('/api/bots', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const origin = getBaseUrl(c) // Base URL needed for manager (even if not used for list)

    try {
        const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
        const bots = await botManager.listBots()
        return c.json({ success: true, data: bots })
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao buscar bots'
        }, 500)
    }
})

// Add Bot
botsRoutes.post('/api/bots', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const body = await c.req.json()

    const name = body.name || ''
    const provider = body.provider as BotProvider

    let credentials: TelegramCredentials | DiscordCredentials

    if (provider === 'telegram') {
        credentials = {
            token: body.telegram_token || '',
        }
    } else if (provider === 'discord') {
        credentials = {
            applicationId: body.discord_application_id || '',
            publicKey: body.discord_public_key || '',
            token: body.discord_token || '',
        }
    } else {
        return c.json({ success: false, error: 'Provider inválido' }, 400)
    }

    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    const result = await botManager.addBot(name, provider, credentials)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 400)
    }

    return c.json({ success: true, data: result.bot })
})

// Check Bot Health
botsRoutes.post('/api/bots/:id/check', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const botId = c.req.param('id')

    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    const bot = await botManager.getBot(botId)
    const result = await botManager.checkBotHealth(botId)

    // Create health check result
    const healthCheckResult = {
        botName: bot?.name || 'Bot',
        status: result.status as 'online' | 'offline' | 'error',
        message: result.error || 'Token válido e respondendo',
        timestamp: new Date().toLocaleString('pt-BR'),
    }

    return c.json({
        success: true,
        healthCheckResult
    })
})

// Delete Bot
botsRoutes.post('/api/bots/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const botId = c.req.param('id')

    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    await botManager.removeBot(botId)

    return c.json({ success: true })
})

// Reconfigure Webhook for a single bot
botsRoutes.post('/api/bots/:id/webhook', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const botId = c.req.param('id')

    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)

    const result = await botManager.setBotWebhook(botId)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, result.error === 'Bot não encontrado' ? 404 : 500)
    }

    return c.json({
        success: true,
        message: `Webhook configurado para ${result.webhookUrl}`,
        webhookUrl: result.webhookUrl,
    })
})

// Refresh ALL webhooks for tenant (useful after domain change)
botsRoutes.post('/api/bots/webhooks/refresh', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const origin = getBaseUrl(c)

    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    const { results } = await botManager.refreshAllWebhooks()

    return c.json({
        success: true,
        baseUrl: origin,
        results,
    })
})

export { botsRoutes }
