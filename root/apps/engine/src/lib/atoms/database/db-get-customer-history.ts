/**
 * ATOM: db-get-customer-history
 * Responsabilidade: Buscar o histórico de interações de um cliente
 */

import type { Result } from '../../../core/types'

export interface CustomerHistoryItem {
    id: string
    metadata: any
    lastFlowId: string | null
    createdAt: string
}

export interface DbGetCustomerHistoryProps {
    db: D1Database
    tenantId: string
    customerId: string
}

export async function dbGetCustomerHistory({
    db,
    tenantId,
    customerId
}: DbGetCustomerHistoryProps): Promise<Result<CustomerHistoryItem[]>> {
    try {
        const { results } = await db.prepare(`
            SELECT id, metadata, last_flow_id as lastFlowId, created_at as createdAt
            FROM customer_history
            WHERE tenant_id = ? AND customer_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).bind(tenantId, customerId).all()

        const data = results.map((r: any) => ({
            ...r,
            metadata: JSON.parse(r.metadata)
        }))

        return { success: true, data }
    } catch (error) {
        return { success: false, error: `Failed to fetch customer history: ${error}` }
    }
}
