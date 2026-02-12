/**
 * ATOM: db-get-customer-by-id
 * Responsabilidade: Buscar um cliente específico por ID
 */

import type { Customer } from '../../../core/types'
import type { Result } from '../../../core/types'

export interface DbGetCustomerByIdProps {
    db: D1Database
    tenantId: string
    id: string
}

export async function dbGetCustomerById({
    db,
    tenantId,
    id
}: DbGetCustomerByIdProps): Promise<Result<Customer | null>> {
    try {
        const row = await db.prepare(`
            SELECT * FROM customers 
            WHERE id = ? AND tenant_id = ?
        `).bind(id, tenantId).first<any>()

        if (!row) {
            return { success: true, data: null }
        }

        const customer: Customer = {
            id: row.id,
            tenantId: row.tenant_id,
            externalId: row.external_id,
            provider: row.provider as 'tg' | 'dc',
            name: row.name,
            username: row.username,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            lastInteraction: row.last_interaction,
            createdAt: row.created_at
        }

        return { success: true, data: customer }
    } catch (error) {
        return { success: false, error: `Failed to get customer: ${error}` }
    }
}
