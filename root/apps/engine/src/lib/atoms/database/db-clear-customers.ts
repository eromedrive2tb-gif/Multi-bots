/**
 * ATOM: db-clear-customers
 * Responsabilidade: Remover todos os clientes de um tenant
 */

import type { Result } from '../../../core/types'

export interface DbClearCustomersProps {
    db: D1Database
    tenantId: string
}

export async function dbClearCustomers({
    db,
    tenantId
}: DbClearCustomersProps): Promise<Result<void>> {
    try {
        const result = await db.prepare(`
            DELETE FROM customers 
            WHERE tenant_id = ?
        `).bind(tenantId).run()

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to clear customers' }
        }

        return { success: true, data: undefined }
    } catch (error) {
        return { success: false, error: `Failed to clear customers: ${error}` }
    }
}
