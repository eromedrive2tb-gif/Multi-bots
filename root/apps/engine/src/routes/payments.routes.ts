/**
 * PAYMENTS ROUTES
 * Handles gateway CRUD, plan CRUD, transactions, and financial summary
 * Follows SRP - Single Responsibility for payment management
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { addGatewaySchema, addPlanSchema } from '../core/payment-types'
import { authMiddleware } from '../middleware/auth'
import { PaymentService } from '../lib/organisms/payments/PaymentService'

const paymentsRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// GATEWAY ENDPOINTS
// ============================================

// List gateways
paymentsRoutes.get('/api/payments/gateways', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    try {
        const service = new PaymentService(c.env.DB, tenant.tenantId)
        const gateways = await service.listGateways()
        // Mask credentials for security
        const masked = gateways.map(g => ({
            ...g,
            credentials: Object.fromEntries(
                Object.entries(g.credentials).map(([k, v]) => [k, '•'.repeat(Math.min(v.length, 8)) + v.slice(-4)])
            ),
        }))
        return c.json({ success: true, data: masked })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

// Add gateway
paymentsRoutes.post('/api/payments/gateways', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const body = await c.req.json()

    const parseResult = addGatewaySchema.safeParse(body)
    if (!parseResult.success) {
        return c.json({
            success: false,
            error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
        }, 400)
    }

    const service = new PaymentService(c.env.DB, tenant.tenantId)
    const result = await service.addGateway(parseResult.data)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 400)
    }
    return c.json({ success: true, data: result.data })
})

// Delete gateway
paymentsRoutes.post('/api/payments/gateways/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const gatewayId = c.req.param('id')

    const service = new PaymentService(c.env.DB, tenant.tenantId)
    const result = await service.removeGateway(gatewayId)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 404)
    }
    return c.json({ success: true })
})

// ============================================
// PLAN ENDPOINTS
// ============================================

// List plans
paymentsRoutes.get('/api/payments/plans', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const activeOnly = c.req.query('active') === 'true'

    try {
        const service = new PaymentService(c.env.DB, tenant.tenantId)
        const plans = await service.listPlans(activeOnly)
        return c.json({ success: true, data: plans })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

// Add plan
paymentsRoutes.post('/api/payments/plans', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const body = await c.req.json()

    const parseResult = addPlanSchema.safeParse(body)
    if (!parseResult.success) {
        return c.json({
            success: false,
            error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
        }, 400)
    }

    const service = new PaymentService(c.env.DB, tenant.tenantId)
    const result = await service.addPlan(parseResult.data)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 400)
    }
    return c.json({ success: true, data: result.data })
})

// Delete (deactivate) plan
paymentsRoutes.post('/api/payments/plans/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const planId = c.req.param('id')

    const service = new PaymentService(c.env.DB, tenant.tenantId)
    const result = await service.deletePlan(planId)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 404)
    }
    return c.json({ success: true })
})

// ============================================
// TRANSACTION ENDPOINTS
// ============================================

// List transactions
paymentsRoutes.get('/api/payments/transactions', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const status = c.req.query('status') as any
    const gatewayId = c.req.query('gateway')
    const botId = c.req.query('bot')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    try {
        const service = new PaymentService(c.env.DB, tenant.tenantId)
        const transactions = await service.listTransactions({
            status: status || undefined,
            gatewayId: gatewayId || undefined,
            botId: botId || undefined,
            limit,
            offset,
        })
        return c.json({ success: true, data: transactions })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

// ============================================
// FINANCIAL SUMMARY
// ============================================

paymentsRoutes.get('/api/payments/summary', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const startDate = c.req.query('start')
    const endDate = c.req.query('end')

    try {
        const service = new PaymentService(c.env.DB, tenant.tenantId)
        const summary = await service.getFinancialSummary(startDate || undefined, endDate || undefined)
        return c.json({ success: true, data: summary })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

// Refresh transaction status from gateway
paymentsRoutes.post('/api/payments/transactions/:id/refresh', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const transactionId = c.req.param('id')

    const service = new PaymentService(c.env.DB, tenant.tenantId)
    const result = await service.refreshTransactionStatus(transactionId)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 400)
    }
    return c.json({ success: true, data: result.data })
})

export { paymentsRoutes }
