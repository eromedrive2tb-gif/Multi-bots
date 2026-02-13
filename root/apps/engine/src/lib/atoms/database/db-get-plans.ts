/**
 * ATOM: db-get-plans
 * Responsabilidade: Lista planos de venda de um tenant
 * SRP: Apenas lê do banco
 */

import type { Plan } from '../../../core/payment-types'

export interface DbGetPlansProps {
    db: D1Database
    tenantId: string
    activeOnly?: boolean
}

export async function dbGetPlans({
    db,
    tenantId,
    activeOnly = false,
}: DbGetPlansProps): Promise<Plan[]> {
    const query = activeOnly
        ? `SELECT * FROM plans WHERE tenant_id = ? AND is_active = 1 ORDER BY price ASC`
        : `SELECT * FROM plans WHERE tenant_id = ? ORDER BY price ASC`

    const result = await db.prepare(query).bind(tenantId).all()

    return (result.results || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        price: row.price,
        currency: row.currency,
        type: row.type,
        intervalDays: row.interval_days,
        isActive: Boolean(row.is_active),
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }))
}
