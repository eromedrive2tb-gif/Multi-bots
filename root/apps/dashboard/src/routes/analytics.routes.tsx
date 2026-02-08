/**
 * ROUTES: Analytics
 * Responsabilidade: Endpoints para o dashboard de analytics
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { authMiddleware } from '../middleware/auth'
import { AnalyticsPage } from '../pages/analytics'
import { getAnalyticsDashboard, type AnalyticsDashboardData } from '../lib/molecules/analytics-aggregator'
import { analyticsFilterSchema, type AnalyticsFilterParams } from '../core/analytics-types'

export const analyticsRoutes = new Hono<{ Bindings: Env }>()

// Apply auth middleware
analyticsRoutes.use('/api/analytics', authMiddleware)

// GET /api/analytics - Analytics data for the dashboard
analyticsRoutes.get('/api/analytics', async (c) => {
    const tenant = c.get('tenant')
    const { tenantId } = tenant

    // Parse query params for filters
    const rawFilters = {
        botId: c.req.query('botId') || undefined,
        blueprintId: c.req.query('blueprintId') || undefined,
        dateFrom: c.req.query('dateFrom') || undefined,
        dateTo: c.req.query('dateTo') || undefined,
        status: c.req.query('status') || 'all',
    }

    // Validate filters
    const parsed = analyticsFilterSchema.safeParse(rawFilters)
    const filters: AnalyticsFilterParams = parsed.success ? parsed.data : { status: 'all' }

    // Get analytics data
    const result = await getAnalyticsDashboard(c.env.DB, tenantId, filters)

    if (!result.success) {
        return c.json({ success: false, error: result.error || 'Erro ao carregar dados' }, 500)
    }

    return c.json({ success: true, data: result.data })
})

// DELETE /api/analytics - Clear all analytics data
analyticsRoutes.delete('/api/analytics', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    // Import dynamically to avoid circular dependencies if any (though atoms are safe)
    const { dbClearAnalytics } = await import('../lib/atoms/database/db-clear-analytics')

    const result = await dbClearAnalytics({
        db: c.env.DB,
        tenantId: tenant.tenantId
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true })
})
