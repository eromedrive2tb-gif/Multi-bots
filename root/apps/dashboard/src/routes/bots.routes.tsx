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
import { dbGetBots, dbGetBotById } from '../lib/atoms/database'
import { tgSetWebhook } from '../lib/atoms/telegram'

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
// DASHBOARD PAGES
// ============================================

botsRoutes.get('/dashboard/bots', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    const bots = await botManager.listBots()

    return c.render(
        <BotsPage
            user={tenant.user}
            bots={bots}
        />
    )
})

// ============================================
// BOT API ENDPOINTS
// ============================================

// Add Bot
botsRoutes.post('/api/bots', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const formData = await c.req.formData()

    const name = formData.get('name')?.toString() || ''
    const provider = formData.get('provider')?.toString() as BotProvider

    let credentials: TelegramCredentials | DiscordCredentials

    if (provider === 'telegram') {
        credentials = {
            token: formData.get('telegram_token')?.toString() || '',
        }
    } else if (provider === 'discord') {
        credentials = {
            applicationId: formData.get('discord_application_id')?.toString() || '',
            publicKey: formData.get('discord_public_key')?.toString() || '',
            token: formData.get('discord_token')?.toString() || '',
        }
    } else {
        return c.redirect('/dashboard/bots?error=Provider+inválido')
    }

    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    const result = await botManager.addBot(name, provider, credentials)

    if (!result.success) {
        const bots = await botManager.listBots()
        return c.render(
            <BotsPage
                user={tenant.user}
                bots={bots}
                error={result.error}
            />
        )
    }

    return c.redirect('/dashboard/bots')
})

// Check Bot Health
botsRoutes.post('/api/bots/:id/check', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const botId = c.req.param('id')

    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    const bot = await botManager.getBot(botId)
    const result = await botManager.checkBotHealth(botId)
    const bots = await botManager.listBots()

    // Create health check result for alert
    const healthCheckResult = {
        botName: bot?.name || 'Bot',
        status: result.status as 'online' | 'offline' | 'error',
        message: result.error || 'Token válido e respondendo',
        timestamp: new Date().toLocaleString('pt-BR'),
    }

    return c.render(
        <BotsPage
            user={tenant.user}
            bots={bots}
            healthCheckResult={healthCheckResult}
        />
    )
})

// Delete Bot
botsRoutes.post('/api/bots/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const botId = c.req.param('id')

    const origin = getBaseUrl(c)
    const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
    await botManager.removeBot(botId)

    return c.redirect('/dashboard/bots')
})

// Reconfigure Webhook for a single bot
botsRoutes.post('/api/bots/:id/webhook', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const botId = c.req.param('id')

    const webhookBaseUrl = getBaseUrl(c)
    const bot = await dbGetBotById({ db: c.env.DB, id: botId })

    if (!bot || bot.tenantId !== tenant.tenantId) {
        return c.json({ success: false, error: 'Bot não encontrado' }, 404)
    }

    if (bot.provider === 'telegram') {
        const tgCreds = bot.credentials as TelegramCredentials
        const webhookUrl = `${webhookBaseUrl}/webhooks/telegram/${botId}`

        try {
            await tgSetWebhook({
                token: tgCreds.token,
                url: webhookUrl,
                secretToken: bot.webhookSecret || undefined,
            })

            return c.json({
                success: true,
                message: `Webhook configurado para ${webhookUrl}`,
                webhookUrl,
            })
        } catch (error) {
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao configurar webhook'
            }, 500)
        }
    }

    return c.json({ success: false, error: 'Provider não suportado' }, 400)
})

// Refresh ALL webhooks for tenant (useful after domain change)
botsRoutes.post('/api/bots/webhooks/refresh', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const webhookBaseUrl = getBaseUrl(c)

    const bots = await dbGetBots({ db: c.env.DB, tenantId: tenant.tenantId })
    const results: { botId: string; name: string; success: boolean; webhookUrl?: string; error?: string }[] = []

    for (const bot of bots) {
        if (bot.provider === 'telegram') {
            const tgCreds = bot.credentials as TelegramCredentials
            const webhookUrl = `${webhookBaseUrl}/webhooks/telegram/${bot.id}`

            try {
                await tgSetWebhook({
                    token: tgCreds.token,
                    url: webhookUrl,
                    secretToken: bot.webhookSecret || undefined,
                })
                results.push({ botId: bot.id, name: bot.name, success: true, webhookUrl })
            } catch (error) {
                results.push({
                    botId: bot.id,
                    name: bot.name,
                    success: false,
                    error: error instanceof Error ? error.message : 'Erro'
                })
            }
        }
    }

    return c.json({
        success: true,
        baseUrl: webhookBaseUrl,
        results,
    })
})

export { botsRoutes }
