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
analyticsRoutes.use('/dashboard/analytics', authMiddleware)

// GET /dashboard/analytics - Main analytics page
analyticsRoutes.get('/dashboard/analytics', async (c) => {
    const tenant = c.get('tenant')
    const { tenantId, user } = tenant

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
        // Return page with empty data on error
        return c.render(
            <AnalyticsPage
                user={user}
                data={{
                    overview: {
                        totalBots: 0,
                        activeBots: 0,
                        totalBlueprints: 0,
                        activeBlueprints: 0,
                        totalFlowStarts: 0,
                        totalFlowCompletions: 0,
                        completionRate: 0,
                        totalErrors: 0,
                    },
                    blueprints: [],
                    bots: [],
                }}
                filters={filters}
            />
        )
    }

    return c.render(
        <AnalyticsPage
            user={user}
            data={result.data}
            filters={filters}
        />
    )
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
