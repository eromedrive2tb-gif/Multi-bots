/**
 * ATOM: db-update-transaction
 * Responsabilidade: Atualiza status de uma transação
 * SRP: Apenas atualiza no banco
 */

import type { TransactionStatus } from '../../../core/payment-types'

export interface DbUpdateTransactionProps {
    db: D1Database
    transactionId: string
    tenantId: string
    status: TransactionStatus
    paidAt?: string
    externalId?: string
}

export async function dbUpdateTransaction({
    db,
    transactionId,
    tenantId,
    status,
    paidAt,
    externalId,
}: DbUpdateTransactionProps): Promise<boolean> {
    const now = new Date().toISOString()

    let query = `UPDATE transactions SET status = ?, updated_at = ?`
    const bindings: any[] = [status, now]

    if (paidAt) {
        query += `, paid_at = ?`
        bindings.push(paidAt)
    }

    if (externalId) {
        query += `, external_id = ?`
        bindings.push(externalId)
    }

    query += ` WHERE id = ? AND tenant_id = ?`
    bindings.push(transactionId, tenantId)

    const result = await db.prepare(query).bind(...bindings).run()
    return (result.meta?.changes ?? 0) > 0
}

/**
 * ATOM: db-update-transaction-by-external
 * Atualiza transação pelo ID externo do gateway (para webhooks)
 */
export async function dbUpdateTransactionByExternal({
    db,
    externalId,
    status,
    paidAt,
}: {
    db: D1Database
    externalId: string
    status: TransactionStatus
    paidAt?: string
}): Promise<{ updated: boolean; transactionId?: string; tenantId?: string }> {
    const now = new Date().toISOString()

    // Primeiro busca a transação
    const tx = await db.prepare(`
        SELECT id, tenant_id FROM transactions WHERE external_id = ?
    `).bind(externalId).first()

    if (!tx) {
        return { updated: false }
    }

    let query = `UPDATE transactions SET status = ?, updated_at = ?`
    const bindings: any[] = [status, now]

    if (paidAt) {
        query += `, paid_at = ?`
        bindings.push(paidAt)
    }

    query += ` WHERE external_id = ?`
    bindings.push(externalId)

    await db.prepare(query).bind(...bindings).run()

    return {
        updated: true,
        transactionId: tx.id as string,
        tenantId: tx.tenant_id as string,
    }
}
