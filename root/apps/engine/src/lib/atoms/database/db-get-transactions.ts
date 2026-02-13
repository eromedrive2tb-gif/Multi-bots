/**
 * ATOM: db-get-transactions
 * Responsabilidade: Lista e busca transações de um tenant
 * SRP: Apenas lê do banco
 */

import type { Transaction, FinancialSummary } from '../../../core/payment-types'

export interface DbGetTransactionsProps {
    db: D1Database
    tenantId: string
    status?: Transaction['status']
    gatewayId?: string
    customerId?: string
    botId?: string
    limit?: number
    offset?: number
}

export async function dbGetTransactions({
    db,
    tenantId,
    status,
    gatewayId,
    customerId,
    botId,
    limit = 50,
    offset = 0,
}: DbGetTransactionsProps): Promise<Transaction[]> {
    let query = `SELECT * FROM transactions WHERE tenant_id = ?`
    const bindings: any[] = [tenantId]

    if (status) {
        query += ` AND status = ?`
        bindings.push(status)
    }
    if (gatewayId) {
        query += ` AND gateway_id = ?`
        bindings.push(gatewayId)
    }
    if (customerId) {
        query += ` AND customer_id = ?`
        bindings.push(customerId)
    }
    if (botId) {
        query += ` AND bot_id = ?`
        bindings.push(botId)
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    bindings.push(limit, offset)

    const result = await db.prepare(query).bind(...bindings).all()

    return (result.results || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        customerId: row.customer_id,
        gatewayId: row.gateway_id,
        planId: row.plan_id,
        botId: row.bot_id,
        flowId: row.flow_id,
        externalId: row.external_id,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        paymentMethod: row.payment_method,
        pixCode: row.pix_code,
        pixQrcode: row.pix_qrcode,
        metadata: JSON.parse(row.metadata || '{}'),
        paidAt: row.paid_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }))
}

/**
 * ATOM: db-get-financial-summary
 * Retorna resumo financeiro do tenant
 */
export async function dbGetFinancialSummary({
    db,
    tenantId,
    startDate,
    endDate,
}: {
    db: D1Database
    tenantId: string
    startDate?: string
    endDate?: string
}): Promise<FinancialSummary> {
    let dateFilter = ''
    const bindings: any[] = [tenantId]

    if (startDate && endDate) {
        dateFilter = ` AND created_at >= ? AND created_at <= ?`
        bindings.push(startDate, endDate)
    }

    const result = await db.prepare(`
        SELECT
            COALESCE(SUM(CASE WHEN status IN ('pending', 'paid') THEN amount ELSE 0 END), 0) as total_generated,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
            COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as total_refunded,
            COUNT(CASE WHEN status IN ('pending', 'paid') THEN 1 END) as count_generated,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as count_paid,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as count_pending,
            COUNT(CASE WHEN status = 'refunded' THEN 1 END) as count_refunded
        FROM transactions
        WHERE tenant_id = ?${dateFilter}
    `).bind(...bindings).first()

    const totalPaid = Number(result?.total_paid ?? 0)
    const countPaid = Number(result?.count_paid ?? 0)
    const countGenerated = Number(result?.count_generated ?? 0)

    return {
        totalGenerated: Number(result?.total_generated ?? 0),
        totalPaid,
        totalPending: Number(result?.total_pending ?? 0),
        totalRefunded: Number(result?.total_refunded ?? 0),
        countGenerated,
        countPaid,
        countPending: Number(result?.count_pending ?? 0),
        countRefunded: Number(result?.count_refunded ?? 0),
        ticketMedio: countPaid > 0 ? Math.round(totalPaid / countPaid) : 0,
        approvalRate: countGenerated > 0 ? Math.round((countPaid / countGenerated) * 100) : 0,
    }
}
