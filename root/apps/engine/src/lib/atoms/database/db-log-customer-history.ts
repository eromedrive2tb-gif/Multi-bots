/**
 * ATOM: db-log-customer-history
 * Responsabilidade: Registrar um snapshot de metadados no histórico
 */

import type { Result } from '../../../core/types'

export interface DbLogCustomerHistoryProps {
    db: D1Database
    tenantId: string
    customerId: string
    metadata: any
    flowId?: string
}

export async function dbLogCustomerHistory({
    db,
    tenantId,
    customerId,
    metadata,
    flowId
}: DbLogCustomerHistoryProps): Promise<Result<void>> {
    try {
        const id = crypto.randomUUID()
        const metadataJson = JSON.stringify(metadata)

        const result = await db.prepare(`
            INSERT INTO customer_history (id, customer_id, tenant_id, metadata, last_flow_id)
            VALUES (?, ?, ?, ?, ?)
        `).bind(id, customerId, tenantId, metadataJson, flowId || null).run()

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to log customer history' }
        }

        return { success: true, data: undefined }
    } catch (error) {
        return { success: false, error: `Failed to log customer history: ${error}` }
    }
}
