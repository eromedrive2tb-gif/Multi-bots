/**
 * ATOM: db-get-gateways
 * Responsabilidade: Lista gateways de pagamento de um tenant
 * SRP: Apenas lê do banco
 */

import type { PaymentGateway } from '../../../core/payment-types'

export interface DbGetGatewaysProps {
    db: D1Database
    tenantId: string
    activeOnly?: boolean
}

export async function dbGetGateways({
    db,
    tenantId,
    activeOnly = false,
}: DbGetGatewaysProps): Promise<PaymentGateway[]> {
    const query = activeOnly
        ? `SELECT * FROM payment_gateways WHERE tenant_id = ? AND is_active = 1 ORDER BY is_default DESC, created_at DESC`
        : `SELECT * FROM payment_gateways WHERE tenant_id = ? ORDER BY is_default DESC, created_at DESC`

    const result = await db.prepare(query).bind(tenantId).all()

    return (result.results || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        provider: row.provider,
        credentials: JSON.parse(row.credentials || '{}'),
        isDefault: Boolean(row.is_default),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }))
}
