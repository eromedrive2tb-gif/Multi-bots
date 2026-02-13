/**
 * ATOM: db-save-transaction
 * Responsabilidade: Salva uma transação de pagamento no banco D1
 * SRP: Apenas insere no banco
 */

import type { Transaction } from '../../../core/payment-types'

export interface DbSaveTransactionProps {
    db: D1Database
    id: string
    tenantId: string
    customerId?: string
    gatewayId: string
    planId?: string
    botId?: string
    flowId?: string
    externalId?: string
    amount: number // centavos
    currency?: string
    status?: Transaction['status']
    paymentMethod?: string
    pixCode?: string
    pixQrcode?: string
    metadata?: Record<string, unknown>
    expiresAt?: string
}

export async function dbSaveTransaction({
    db,
    id,
    tenantId,
    customerId,
    gatewayId,
    planId,
    botId,
    flowId,
    externalId,
    amount,
    currency = 'BRL',
    status = 'pending',
    paymentMethod = 'pix',
    pixCode,
    pixQrcode,
    metadata = {},
    expiresAt,
}: DbSaveTransactionProps): Promise<Transaction> {
    const now = new Date().toISOString()

    await db.prepare(`
        INSERT INTO transactions (
            id, tenant_id, customer_id, gateway_id, plan_id, bot_id, flow_id,
            external_id, amount, currency, status, payment_method,
            pix_code, pix_qrcode, metadata, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id, tenantId, customerId || null, gatewayId, planId || null,
        botId || null, flowId || null, externalId || null,
        amount, currency, status, paymentMethod,
        pixCode || null, pixQrcode || null, JSON.stringify(metadata),
        expiresAt || null, now, now
    ).run()

    return {
        id,
        tenantId,
        customerId: customerId || null,
        gatewayId,
        planId: planId || null,
        botId: botId || null,
        flowId: flowId || null,
        externalId: externalId || null,
        amount,
        currency,
        status,
        paymentMethod,
        pixCode: pixCode || null,
        pixQrcode: pixQrcode || null,
        metadata,
        paidAt: null,
        expiresAt: expiresAt || null,
        createdAt: now,
        updatedAt: now,
    }
}
