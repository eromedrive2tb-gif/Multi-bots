/**
 * ATOM: db-clear-analytics
 * Responsabilidade: Executar remoção de todos os eventos de analytics de um tenant
 * Proibido: Importar outros atoms, molecules ou organisms
 */

import type { Result } from '../../../core/types'

interface ClearAnalyticsParams {
    db: D1Database
    tenantId: string
}

/**
 * Remove TODOS os eventos de analytics do tenant
 * Ação destrutiva e irreversível
 */
export async function dbClearAnalytics(params: ClearAnalyticsParams): Promise<Result<{ deleted: boolean }>> {
    const { db, tenantId } = params

    try {
        const result = await db.prepare(
            `DELETE FROM analytics_events WHERE tenant_id = ?`
        ).bind(tenantId).run()

        return {
            success: true,
            data: { deleted: result.success }
        }
    } catch (error) {
        return {
            success: false,
            error: `Failed to clear analytics: ${error}`
        }
    }
}
