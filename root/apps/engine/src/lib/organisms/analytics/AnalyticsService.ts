/**
 * ORGANISM: AnalyticsService
 * Responsabilidade: Agregação e Gerenciamento de Dados de Analytics
 * Orquestra: Molecules (Aggregator) e Atoms (Database)
 */

import { getAnalyticsDashboard, type AnalyticsDashboardData } from '../../molecules'
import { analyticsFilterSchema, type AnalyticsFilterParams } from '../../../core/analytics-types'

export class AnalyticsService {
    constructor(private db: D1Database, private tenantId: string) { }

    /**
     * Obtém dados do dashboard com filtros
     */
    async getDashboard(rawFilters: Record<string, any>): Promise<{ success: boolean; data?: AnalyticsDashboardData; error?: string }> {
        // Validate filters
        const parsed = analyticsFilterSchema.safeParse(rawFilters)
        const filters: AnalyticsFilterParams = parsed.success ? parsed.data : { status: 'all' }

        // Get analytics data
        return getAnalyticsDashboard(this.db, this.tenantId, filters)
    }

    /**
     * Limpa todos os dados de analytics do tenant
     */
    async clearMetrics(): Promise<{ success: boolean; error?: string }> {
        // Import dynamically to avoid circular dependencies if any
        const { dbClearAnalytics } = await import('../../atoms')

        return dbClearAnalytics({
            db: this.db,
            tenantId: this.tenantId
        })
    }
}
