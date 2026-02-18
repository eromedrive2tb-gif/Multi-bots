/**
 * BROADCASTS & REMARKETING ROUTES
 * Handles broadcast CRUD + send + remarketing campaign management
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { createBroadcastSchema, createCampaignSchema } from '../core/broadcast-types'
import { authMiddleware } from '../middleware/auth'
import { BroadcastService } from '../lib/organisms/broadcast/BroadcastService'

const broadcastRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// BROADCAST ENDPOINTS
// ============================================

broadcastRoutes.get('/api/broadcasts', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const status = c.req.query('status') as any
    const botId = c.req.query('bot')

    try {
        const service = new BroadcastService(c.env.DB, tenant.tenantId)
        const broadcasts = await service.listBroadcasts(status || undefined, botId || undefined)
        return c.json({ success: true, data: broadcasts })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

broadcastRoutes.post('/api/broadcasts', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const body = await c.req.json()

    const parseResult = createBroadcastSchema.safeParse(body)
    if (!parseResult.success) {
        return c.json({
            success: false,
            error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
        }, 400)
    }

    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.createBroadcast(parseResult.data)

    if (!result.success) return c.json({ success: false, error: result.error }, 400)
    return c.json({ success: true, data: result.data })
})

broadcastRoutes.post('/api/broadcasts/:id/send', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const broadcastId = c.req.param('id')

    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.sendBroadcastNow(broadcastId)

    if (!result.success) return c.json({ success: false, error: result.error }, 400)
    return c.json({ success: true, data: result.data })
})

broadcastRoutes.post('/api/broadcasts/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const broadcastId = c.req.param('id')

    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.deleteBroadcast(broadcastId)

    if (!result.success) return c.json({ success: false, error: result.error }, 404)
    return c.json({ success: true })
})

// ============================================
// REMARKETING CAMPAIGN ENDPOINTS
// ============================================

// ============================================
// REMARKETING CAMPAIGN ENDPOINTS
// ============================================

broadcastRoutes.get('/api/broadcasts/campaigns', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const status = c.req.query('status') as any

    try {
        const service = new BroadcastService(c.env.DB, tenant.tenantId)
        const campaigns = await service.listCampaigns(status || undefined)
        return c.json({ success: true, data: campaigns })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

broadcastRoutes.post('/api/broadcasts/campaigns', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const body = await c.req.json()

    // Validação usando o schema central do core/types.ts (Importado no topo, mas verificando broadcast-types)
    // O schema createCampaignSchema deve estar correto
    const parseResult = createCampaignSchema.safeParse(body)
    if (!parseResult.success) {
        return c.json({
            success: false,
            error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
        }, 400)
    }

    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.createCampaign(parseResult.data)

    if (!result.success) return c.json({ success: false, error: result.error }, 400)
    return c.json({ success: true, data: result.data })
})

broadcastRoutes.post('/api/broadcasts/campaigns/:id/activate', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.activateCampaign(c.req.param('id'), c.env.CAMPAIGN_SCHEDULER_DO)
    if (!result.success) return c.json({ success: false, error: result.error }, 400)
    return c.json({ success: true })
})

broadcastRoutes.post('/api/broadcasts/campaigns/:id/pause', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.pauseCampaign(c.req.param('id'))
    if (!result.success) return c.json({ success: false, error: result.error }, 400)
    return c.json({ success: true })
})

broadcastRoutes.post('/api/broadcasts/campaigns/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.deleteCampaign(c.req.param('id'))
    if (!result.success) return c.json({ success: false, error: result.error }, 404)
    return c.json({ success: true })
})

broadcastRoutes.get('/api/broadcasts/campaigns/:id/recipients', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.getCampaignRecipients(c.req.param('id'))
    return c.json({ success: true, data: result })
})

broadcastRoutes.get('/api/broadcasts/ws', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.env.USER_SESSION_DO.idFromName(tenant.userId)
    const stub = c.env.USER_SESSION_DO.get(id)

    // Forward the request to the Durable Object for WebSocket upgrade
    return stub.fetch(c.req.raw)
})

broadcastRoutes.get('/api/broadcasts/debug-scheduler', async (c, next) => {
    // Custom auth for debug: allow header bypass
    const headerTenant = c.req.header('x-tenant-id');
    if (headerTenant) {
        c.set('tenant', { tenantId: headerTenant, userId: 'debug', user: { id: 'debug', name: 'Debug', email: 'debug' } });
        await next();
    } else {
        return authMiddleware(c, next);
    }
}, async (c) => {
    const tenant = c.get('tenant')
    const service = new BroadcastService(c.env.DB, tenant.tenantId)
    const result = await service.getSchedulerDebug(c.env.CAMPAIGN_SCHEDULER_DO)
    return c.json({ success: true, data: result })
})

export { broadcastRoutes }
