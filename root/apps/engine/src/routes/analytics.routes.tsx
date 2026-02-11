/**
 * ROUTES: Analytics
 * Responsabilidade: Endpoints para o dashboard de analytics
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { authMiddleware } from '../middleware/auth'
import { AnalyticsService } from '../lib/organisms'

export const analyticsRoutes = new Hono<{ Bindings: Env }>()

// Apply auth middleware
analyticsRoutes.use('/api/analytics', authMiddleware)

// GET /api/analytics - Analytics data for the dashboard
analyticsRoutes.get('/api/analytics', async (c) => {
    const tenant = c.get('tenant')

    // Parse query params for filters
    const rawFilters = {
        botId: c.req.query('botId') || undefined,
        blueprintId: c.req.query('blueprintId') || undefined,
        dateFrom: c.req.query('dateFrom') || undefined,
        dateTo: c.req.query('dateTo') || undefined,
        status: c.req.query('status') || 'all',
    }

    const analyticsService = new AnalyticsService(c.env.DB, tenant.tenantId)
    const result = await analyticsService.getDashboard(rawFilters)

    if (!result.success) {
        return c.json({ success: false, error: result.error || 'Erro ao carregar dados' }, 500)
    }

    return c.json({ success: true, data: result.data })
})

// DELETE /api/analytics - Clear all analytics data
analyticsRoutes.delete('/api/analytics', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    const analyticsService = new AnalyticsService(c.env.DB, tenant.tenantId)
    const result = await analyticsService.clearMetrics()

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true })
})
