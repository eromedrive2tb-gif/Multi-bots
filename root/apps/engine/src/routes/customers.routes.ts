/**
 * CUSTOMERS ROUTES
 * Handles customer/audience management
 * Follows SRP - Single Responsibility for customer management
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { authMiddleware } from '../middleware/auth'
import { dbGetCustomers, dbGetCustomerById, dbDeleteCustomer } from '../lib/atoms'

const customersRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// CUSTOMER API ENDPOINTS
// ============================================

// List customers
customersRoutes.get('/api/customers', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const limit = Number(c.req.query('limit')) || 20
    const offset = Number(c.req.query('offset')) || 0
    const search = c.req.query('search')
    const provider = c.req.query('provider') as 'tg' | 'dc' | undefined

    const result = await dbGetCustomers({
        db: c.env.DB,
        tenantId: tenant.tenantId,
        limit,
        offset,
        search,
        provider
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true, data: result.data })
})

// Get customer details
customersRoutes.get('/api/customers/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const result = await dbGetCustomerById({
        db: c.env.DB,
        tenantId: tenant.tenantId,
        id
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    if (!result.data) {
        return c.json({ success: false, error: 'Customer not found' }, 404)
    }

    return c.json({ success: true, data: result.data })
})

// Delete customer
customersRoutes.delete('/api/customers/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    // Optional: Check if customer exists first
    const check = await dbGetCustomerById({
        db: c.env.DB,
        tenantId: tenant.tenantId,
        id
    })

    if (!check.success || !check.data) {
        return c.json({ success: false, error: 'Customer not found' }, 404)
    }

    const result = await dbDeleteCustomer({
        db: c.env.DB,
        tenantId: tenant.tenantId,
        id
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true })
})

export { customersRoutes }
