/**
 * PAYMENT WEBHOOKS ROUTES
 * Receives payment confirmation webhooks from external gateways
 * These are PUBLIC routes (no auth middleware) - gateways send webhooks directly
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import {
    handleWebhookPayment,
    parseMercadoPagoWebhook,
    parsePushinPayWebhook,
    parseAsaasWebhook,
} from '../lib/molecules/payments/handle-webhook-payment'
import { checkPaymentStatus } from '../lib/atoms/payments/check-payment-status'
import { dbGetGateways } from '../lib/atoms/database/db-get-gateways'
import { dbGetTransactions } from '../lib/atoms/database/db-get-transactions'

const paymentWebhooksRoutes = new Hono<{ Bindings: Env }>()

/**
 * MercadoPago Webhook
 * POST /api/webhooks/payments/mercadopago
 */
paymentWebhooksRoutes.post('/api/webhooks/payments/mercadopago', async (c) => {
    try {
        const body = await c.req.json()
        const parsed = parseMercadoPagoWebhook(body)

        if (!parsed) {
            return c.json({ received: true, action: 'ignored' }, 200)
        }

        // MercadoPago webhook não envia status final, precisamos consultar
        // Buscar transação pelo externalId para obter o tenantId e gateway
        const tx = await c.env.DB.prepare(
            `SELECT t.*, pg.credentials, pg.provider FROM transactions t 
             JOIN payment_gateways pg ON t.gateway_id = pg.id 
             WHERE t.external_id = ?`
        ).bind(parsed.externalId).first() as any

        if (tx) {
            const statusResult = await checkPaymentStatus({
                provider: 'mercadopago',
                credentials: JSON.parse(tx.credentials),
                externalId: parsed.externalId,
            })

            if (statusResult.success) {
                parsed.status = statusResult.status
                parsed.paidAt = statusResult.paidAt || undefined
            }
        }

        const result = await handleWebhookPayment(c.env.DB, parsed)

        return c.json({ received: true, processed: result.success }, 200)
    } catch (error) {
        console.error('MercadoPago webhook error:', error)
        return c.json({ received: true, error: 'internal' }, 200) // Always 200 to avoid retries
    }
})

/**
 * PushinPay Webhook
 * POST /api/webhooks/payments/pushinpay
 */
paymentWebhooksRoutes.post('/api/webhooks/payments/pushinpay', async (c) => {
    try {
        const body = await c.req.json()
        const parsed = parsePushinPayWebhook(body)

        if (!parsed) {
            return c.json({ received: true, action: 'ignored' }, 200)
        }

        const result = await handleWebhookPayment(c.env.DB, parsed)
        return c.json({ received: true, processed: result.success }, 200)
    } catch (error) {
        console.error('PushinPay webhook error:', error)
        return c.json({ received: true, error: 'internal' }, 200)
    }
})

/**
 * Asaas Webhook
 * POST /api/webhooks/payments/asaas
 */
paymentWebhooksRoutes.post('/api/webhooks/payments/asaas', async (c) => {
    try {
        const body = await c.req.json()
        const parsed = parseAsaasWebhook(body)

        if (!parsed) {
            return c.json({ received: true, action: 'ignored' }, 200)
        }

        const result = await handleWebhookPayment(c.env.DB, parsed)
        return c.json({ received: true, processed: result.success }, 200)
    } catch (error) {
        console.error('Asaas webhook error:', error)
        return c.json({ received: true, error: 'internal' }, 200)
    }
})

export { paymentWebhooksRoutes }
