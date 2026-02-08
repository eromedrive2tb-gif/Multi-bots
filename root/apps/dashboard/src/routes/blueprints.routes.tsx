/**
 * BLUEPRINTS ROUTES
 * Handles blueprint CRUD, sync, and debug endpoints
 * Follows SRP - Single Responsibility for blueprint management
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { blueprintSchema } from '../core/types'
import { authMiddleware } from '../middleware/auth'
import { FlowService } from '../lib/organisms/FlowService'
import { BlueprintService } from '../lib/organisms/BlueprintService'

const blueprintsRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// API ENDPOINTS
// ============================================

// List all blueprints
blueprintsRoutes.get('/api/blueprints', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const blueprintService = new BlueprintService(c.env.DB, c.env.BLUEPRINTS_KV, tenant.tenantId)

    const result = await blueprintService.listBlueprints()

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true, data: result.data })
})

// Get single blueprint
blueprintsRoutes.get('/api/blueprints/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const blueprintService = new BlueprintService(c.env.DB, c.env.BLUEPRINTS_KV, tenant.tenantId)
    const result = await blueprintService.getBlueprint(id)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 404)
    }

    return c.json({ success: true, data: result.data })
})

// Create new blueprint
blueprintsRoutes.post('/api/blueprints', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    try {
        const body = await c.req.json()

        // Validate blueprint
        const parsed = blueprintSchema.safeParse(body)
        if (!parsed.success) {
            return c.json({
                success: false,
                error: `Blueprint inválido: ${parsed.error.message}`
            }, 400)
        }

        const blueprintService = new BlueprintService(c.env.DB, c.env.BLUEPRINTS_KV, tenant.tenantId)
        const result = await blueprintService.saveBlueprint(parsed.data)

        if (!result.success) {
            return c.json({ success: false, error: result.error }, 500)
        }

        return c.json({ success: true, data: result.data }, 201)
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao criar blueprint'
        }, 500)
    }
})

// Update blueprint
blueprintsRoutes.put('/api/blueprints/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    try {
        const body = await c.req.json()
        body.id = id

        // Validate blueprint
        const parsed = blueprintSchema.safeParse(body)
        if (!parsed.success) {
            return c.json({
                success: false,
                error: `Blueprint inválido: ${parsed.error.message}`
            }, 400)
        }

        const blueprintService = new BlueprintService(c.env.DB, c.env.BLUEPRINTS_KV, tenant.tenantId)
        const result = await blueprintService.saveBlueprint(parsed.data)

        if (!result.success) {
            return c.json({ success: false, error: result.error }, 500)
        }

        return c.json({ success: true, data: result.data })
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao atualizar blueprint'
        }, 500)
    }
})

// Delete blueprint (DELETE method)
blueprintsRoutes.delete('/api/blueprints/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const blueprintService = new BlueprintService(c.env.DB, c.env.BLUEPRINTS_KV, tenant.tenantId)
    const result = await blueprintService.deleteBlueprint(id)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true })
})

// Delete blueprint (POST method)
blueprintsRoutes.post('/api/blueprints/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const blueprintService = new BlueprintService(c.env.DB, c.env.BLUEPRINTS_KV, tenant.tenantId)
    const result = await blueprintService.deleteBlueprint(id)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true })
})

// ============================================
// SYNC & DEBUG ENDPOINTS
// ============================================

// Sync all blueprints from D1 to KV
blueprintsRoutes.post('/api/blueprints/sync', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    const blueprintService = new BlueprintService(c.env.DB, c.env.BLUEPRINTS_KV, tenant.tenantId)
    const result = await blueprintService.fullSyncToKv()

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({
        success: true,
        message: `Sincronizado: ${result.data.synced} blueprints | Falhas: ${result.data.failed}`,
        data: result.data,
    })
})

// Debug endpoint: Test blueprint execution (without Telegram)
blueprintsRoutes.post('/api/debug/trigger', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    try {
        const body = await c.req.json<{ trigger: string; userId?: string }>()
        const trigger = body.trigger || '/start'
        const userId = body.userId || 'debug_user_123'

        const flowService = new FlowService(c.env, tenant.tenantId)
        const result = await flowService.debugTrigger(trigger, userId, tenant.user.name)

        console.log('[DEBUG] Flow result:', JSON.stringify(result))

        return c.json({
            success: result.success,
            trigger,
            tenantId: tenant.tenantId,
            result,
        })
    } catch (error) {
        console.error('[DEBUG] Error:', error)
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        }, 500)
    }
})

export { blueprintsRoutes }
