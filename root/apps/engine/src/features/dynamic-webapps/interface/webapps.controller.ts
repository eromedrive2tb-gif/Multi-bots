/**
 * INTERFACE: WebApps Controller
 * Hono router encapsulating all Dynamic WebApp routes:
 * - Public: GET /view/:tenantId/:pageId (serve HTML)
 * - Protected: CRUD API routes for dashboard
 * 
 * Follows Clean Architecture — controller depends on domain + infrastructure.
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../../core/types'
import { authMiddleware } from '../../../middleware/auth'
import { KvPageRepository } from '../infrastructure/kv-page-repository'
import { webAppPageSchema } from '../domain/types'
import type { WebAppPage } from '../domain/types'
import { assembleHtml, getServeHeaders } from '../domain/html-assembler'

const app = new Hono<{ Bindings: Env }>()

// ============================================
// FACTORY: Creates repository from request context
// ============================================

function getRepo(env: Env): KvPageRepository {
    return new KvPageRepository(env.PAGES_KV)
}

// ============================================
// PUBLIC ROUTE: Serve WebApp
// ============================================

/**
 * GET /view/:tenantId/:pageId
 * Serves the assembled HTML for a dynamic webapp.
 * Public route — no auth required (accessed by end users / Telegram WebApp).
 * 
 * Optimizations:
 * - Cache-Control headers for edge caching
 * - CSP headers for security
 * - Singlefile mode: zero processing overhead
 */
app.get('/view/:tenantId/:pageId', async (c) => {
    const { tenantId, pageId } = c.req.param()

    const repo = getRepo(c.env)
    const result = await repo.get(tenantId, pageId)

    if (!result.success) {
        return c.html('<h1>Página não encontrada</h1>', 404)
    }

    const page = result.data
    const html = assembleHtml(page)
    const headers = getServeHeaders()

    return new Response(html, {
        status: 200,
        headers,
    })
})

// ============================================
// PROTECTED API ROUTES (Dashboard)
// ============================================

/**
 * GET /api/pages — List all pages for the authenticated tenant
 */
app.get('/api/pages', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    if (!tenant) {
        return c.json({ success: false, error: 'Usuário não autenticado' }, 401)
    }

    const repo = getRepo(c.env)
    const result = await repo.list(tenant.tenantId)

    if (!result.success) {
        return c.json(result, 500)
    }

    return c.json(result)
})

/**
 * GET /api/pages/:id — Get a single page by ID
 */
app.get('/api/pages/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const pageId = c.req.param('id')

    if (!tenant) {
        return c.json({ success: false, error: 'Usuário não autenticado' }, 401)
    }

    const repo = getRepo(c.env)
    const result = await repo.get(tenant.tenantId, pageId)

    if (!result.success) {
        return c.json(result, 404)
    }

    return c.json(result)
})

/**
 * POST /api/pages — Create or update a page
 * Validates input with Zod discriminated union schema.
 */
app.post('/api/pages', authMiddleware, zValidator('json', webAppPageSchema), async (c) => {
    const tenant = c.get('tenant')
    const body = c.req.valid('json')

    if (!tenant) {
        return c.json({ success: false, error: 'Usuário não autenticado' }, 401)
    }

    const page: WebAppPage = {
        ...body,
        html: body.html ?? '',
        css: body.css ?? '',
        js: body.js ?? '',
        tenantId: tenant.tenantId,
        updatedAt: Date.now(),
    }

    const repo = getRepo(c.env)
    const result = await repo.save(page)

    if (!result.success) {
        return c.json(result, 500)
    }

    return c.json(result)
})

/**
 * DELETE /api/pages/:id — Delete a page
 */
app.delete('/api/pages/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const pageId = c.req.param('id')

    if (!tenant) {
        return c.json({ success: false, error: 'Usuário não autenticado' }, 401)
    }

    const repo = getRepo(c.env)
    const result = await repo.delete(tenant.tenantId, pageId)

    if (!result.success) {
        return c.json(result, 500)
    }

    return c.json(result)
})

export { app as webappsController }
