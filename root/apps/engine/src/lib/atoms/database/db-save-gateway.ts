/**
 * ATOM: db-save-gateway
 * Responsabilidade: Salva um gateway de pagamento no banco D1
 * SRP: Apenas insere no banco, não valida
 */

import type { PaymentGateway } from '../../../core/payment-types'

export interface DbSaveGatewayProps {
    db: D1Database
    id: string
    tenantId: string
    name: string
    provider: PaymentGateway['provider']
    credentials: Record<string, string>
    isDefault?: boolean
}

export async function dbSaveGateway({
    db,
    id,
    tenantId,
    name,
    provider,
    credentials,
    isDefault = false,
}: DbSaveGatewayProps): Promise<PaymentGateway> {
    const now = new Date().toISOString()

    // Se isDefault, desativa outros defaults do tenant
    if (isDefault) {
        await db.prepare(`
            UPDATE payment_gateways SET is_default = 0 WHERE tenant_id = ?
        `).bind(tenantId).run()
    }

    await db.prepare(`
        INSERT INTO payment_gateways (id, tenant_id, name, provider, credentials, is_default, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(id, tenantId, name, provider, JSON.stringify(credentials), isDefault ? 1 : 0, now, now).run()

    return {
        id,
        tenantId,
        name,
        provider,
        credentials,
        isDefault,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    }
}
