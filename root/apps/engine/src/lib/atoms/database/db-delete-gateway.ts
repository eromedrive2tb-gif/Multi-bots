/**
 * ATOM: db-delete-gateway
 * Responsabilidade: Remove um gateway de pagamento
 * SRP: Apenas deleta do banco
 */

export interface DbDeleteGatewayProps {
    db: D1Database
    gatewayId: string
    tenantId: string
}

export async function dbDeleteGateway({
    db,
    gatewayId,
    tenantId,
}: DbDeleteGatewayProps): Promise<boolean> {
    const result = await db.prepare(`
        DELETE FROM payment_gateways WHERE id = ? AND tenant_id = ?
    `).bind(gatewayId, tenantId).run()

    return (result.meta?.changes ?? 0) > 0
}
