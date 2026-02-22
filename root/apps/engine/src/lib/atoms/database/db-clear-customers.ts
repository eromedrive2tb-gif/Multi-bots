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
        // We clear all related tables to ensure no "leftover" metadata or identified data remains.
        // Some tables have CASCADE, but 'transactions' does not, so we clear them all explicitly.
        const batch = [
            db.prepare(`DELETE FROM customer_history WHERE tenant_id = ?`).bind(tenantId),
            db.prepare(`DELETE FROM vip_group_members WHERE tenant_id = ?`).bind(tenantId),
            db.prepare(`DELETE FROM transactions WHERE tenant_id = ?`).bind(tenantId),
            db.prepare(`DELETE FROM remarketing_logs WHERE tenant_id = ?`).bind(tenantId),
            db.prepare(`DELETE FROM customers WHERE tenant_id = ?`).bind(tenantId)
        ]

        const results = await db.batch(batch)

        return { success: true, data: undefined }
    } catch (error) {
        return { success: false, error: `Failed to clear customers: ${error}` }
    }
}
