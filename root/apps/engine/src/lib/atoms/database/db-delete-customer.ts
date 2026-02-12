/**
 * ATOM: db-delete-customer
 * Responsabilidade: Remover um cliente
 */

import type { Result } from '../../../core/types'

export interface DbDeleteCustomerProps {
    db: D1Database
    tenantId: string
    id: string
}

export async function dbDeleteCustomer({
    db,
    tenantId,
    id
}: DbDeleteCustomerProps): Promise<Result<void>> {
    try {
        const result = await db.prepare(`
            DELETE FROM customers 
            WHERE id = ? AND tenant_id = ?
        `).bind(id, tenantId).run()

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to delete customer' }
        }

        return { success: true, data: undefined }
    } catch (error) {
        return { success: false, error: `Failed to delete customer: ${error}` }
    }
}
