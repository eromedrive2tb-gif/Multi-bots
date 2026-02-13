/**
 * MOLECULE: handle-webhook-payment
 * Recebe webhook do gateway → atualiza transação no banco
 * Retorna dados para o Organism decidir o próximo passo do fluxo
 */

import type { Result } from '../../../core/types'
import type { TransactionStatus } from '../../../core/payment-types'
import { dbUpdateTransactionByExternal } from '../../atoms/database/db-update-transaction'

export interface PaymentWebhookData {
    provider: 'mercadopago' | 'pushinpay' | 'asaas'
    externalId: string
    status: TransactionStatus
    paidAt?: string
}

export interface PaymentWebhookResult {
    transactionId: string
    tenantId: string
    status: TransactionStatus
}

/**
 * Normaliza payload de webhook do MercadoPago
 */
export function parseMercadoPagoWebhook(body: any): PaymentWebhookData | null {
    if (body.type !== 'payment' && body.action !== 'payment.updated') return null

    const paymentId = body.data?.id
    if (!paymentId) return null

    return {
        provider: 'mercadopago',
        externalId: String(paymentId),
        status: 'pending', // será resolvido via check_payment_status
    }
}

/**
 * Normaliza payload de webhook do PushinPay
 */
export function parsePushinPayWebhook(body: any): PaymentWebhookData | null {
    if (!body.id && !body.transaction_id) return null

    let status: TransactionStatus = 'pending'
    if (body.status === 'paid' || body.status === 'approved') status = 'paid'
    if (body.status === 'refunded') status = 'refunded'

    return {
        provider: 'pushinpay',
        externalId: body.id || body.transaction_id,
        status,
        paidAt: body.paid_at || (status === 'paid' ? new Date().toISOString() : undefined),
    }
}

/**
 * Normaliza payload de webhook do Asaas
 */
export function parseAsaasWebhook(body: any): PaymentWebhookData | null {
    if (!body.payment?.id) return null

    let status: TransactionStatus = 'pending'
    const event = body.event || ''
    if (event.includes('CONFIRMED') || event.includes('RECEIVED')) status = 'paid'
    if (event.includes('REFUNDED')) status = 'refunded'
    if (event.includes('OVERDUE')) status = 'expired'

    return {
        provider: 'asaas',
        externalId: body.payment.id,
        status,
        paidAt: body.payment.confirmedDate || (status === 'paid' ? new Date().toISOString() : undefined),
    }
}

/**
 * Processa webhook de pagamento genérico
 */
export async function handleWebhookPayment(
    db: D1Database,
    data: PaymentWebhookData
): Promise<Result<PaymentWebhookResult>> {
    try {
        const result = await dbUpdateTransactionByExternal({
            db,
            externalId: data.externalId,
            status: data.status,
            paidAt: data.paidAt,
        })

        if (!result.updated || !result.transactionId || !result.tenantId) {
            return { success: false, error: `Transação não encontrada: ${data.externalId}` }
        }

        return {
            success: true,
            data: {
                transactionId: result.transactionId,
                tenantId: result.tenantId,
                status: data.status,
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao processar webhook',
        }
    }
}
