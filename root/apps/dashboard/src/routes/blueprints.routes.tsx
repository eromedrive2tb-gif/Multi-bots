/**
 * BLUEPRINTS ROUTES
 * Handles blueprint CRUD, sync, and debug endpoints
 * Follows SRP - Single Responsibility for blueprint management
 */

import { Hono } from 'hono'
import type { Env, UniversalContext } from '../core/types'
import { blueprintSchema } from '../core/types'
import { authMiddleware } from '../middleware/auth'
import { dbGetBlueprints, dbGetBlueprintById } from '../lib/atoms/database'
import { syncSaveBlueprint, syncDeleteBlueprint, fullSyncBlueprintsToKv } from '../lib/molecules/blueprint-sync'
import { executeFromTrigger } from '../core/engine'

// Pages
import { BlueprintsPage } from '../pages/blueprints'

const blueprintsRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// DASHBOARD PAGES
// ============================================

blueprintsRoutes.get('/dashboard/blueprints', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    const result = await dbGetBlueprints({
        db: c.env.DB,
        tenantId: tenant.tenantId
    })

    return c.render(
        <BlueprintsPage
            user={tenant.user}
            blueprints={result.success ? result.data : []}
            error={result.success ? undefined : result.error}
        />
    )
})

blueprintsRoutes.get('/dashboard/blueprints/new', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    return c.render(
        <BlueprintsPage
            user={tenant.user}
            blueprints={[]}
        />
    )
})

// ============================================
// API ENDPOINTS
// ============================================

// List all blueprints for tenant
blueprintsRoutes.get('/api/blueprints', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    const result = await dbGetBlueprints({
        db: c.env.DB,
        tenantId: tenant.tenantId
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true, data: result.data })
})

// Get single blueprint
blueprintsRoutes.get('/api/blueprints/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const result = await dbGetBlueprintById({
        db: c.env.DB,
        tenantId: tenant.tenantId,
        id
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    if (!result.data) {
        return c.json({ success: false, error: 'Blueprint não encontrado' }, 404)
    }

    return c.json({ success: true, data: result.data })
})

// Dashboard Editor Route
blueprintsRoutes.get('/dashboard/blueprints/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const listResult = await dbGetBlueprints({
        db: c.env.DB,
        tenantId: tenant.tenantId
    })

    const result = await dbGetBlueprintById({
        db: c.env.DB,
        tenantId: tenant.tenantId,
        id
    })

    if (!result.success || !result.data) {
        return c.redirect('/dashboard/blueprints')
    }

    return c.render(
        <BlueprintsPage
            user={tenant.user}
            blueprints={listResult.success ? listResult.data : []}
            selectedBlueprint={JSON.stringify(result.data, null, 2)}
        />
    )
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

        const result = await syncSaveBlueprint({
            db: c.env.DB,
            kv: c.env.BLUEPRINTS_KV,
            tenantId: tenant.tenantId,
            blueprint: parsed.data,
        })

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

        // Ensure ID matches
        body.id = id

        // Validate blueprint
        const parsed = blueprintSchema.safeParse(body)
        if (!parsed.success) {
            return c.json({
                success: false,
                error: `Blueprint inválido: ${parsed.error.message}`
            }, 400)
        }

        const result = await syncSaveBlueprint({
            db: c.env.DB,
            kv: c.env.BLUEPRINTS_KV,
            tenantId: tenant.tenantId,
            blueprint: parsed.data,
        })

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

// Delete blueprint (DELETE method - for API clients)
blueprintsRoutes.delete('/api/blueprints/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const result = await syncDeleteBlueprint({
        db: c.env.DB,
        kv: c.env.BLUEPRINTS_KV,
        tenantId: tenant.tenantId,
        blueprintId: id,
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true })
})

// Delete blueprint (POST method - for HTML forms/dashboard)
blueprintsRoutes.post('/api/blueprints/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const id = c.req.param('id')

    const result = await syncDeleteBlueprint({
        db: c.env.DB,
        kv: c.env.BLUEPRINTS_KV,
        tenantId: tenant.tenantId,
        blueprintId: id,
    })

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    // Check if request wants JSON or redirect
    const acceptHeader = c.req.header('Accept') || ''
    if (acceptHeader.includes('application/json')) {
        return c.json({ success: true })
    }

    return c.redirect('/dashboard/blueprints')
})

// ============================================
// SYNC & DEBUG ENDPOINTS
// ============================================

// Sync all blueprints from D1 to KV
blueprintsRoutes.post('/api/blueprints/sync', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    const result = await fullSyncBlueprintsToKv({
        db: c.env.DB,
        kv: c.env.BLUEPRINTS_KV,
        tenantId: tenant.tenantId,
    })

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

        // Build mock UniversalContext
        const ctx: UniversalContext = {
            provider: 'tg',
            tenantId: tenant.tenantId,
            userId,
            chatId: userId,
            botToken: 'debug_token',
            metadata: {
                userName: tenant.user.name,
                lastInput: trigger,
                command: trigger.startsWith('/') ? trigger.slice(1) : undefined,
            },
        }

        console.log('[DEBUG] Testing trigger:', trigger, 'for tenant:', tenant.tenantId)

        // Execute flow
        const result = await executeFromTrigger(
            {
                blueprints: c.env.BLUEPRINTS_KV,
                sessions: c.env.SESSIONS_KV,
            },
            ctx
        )

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
