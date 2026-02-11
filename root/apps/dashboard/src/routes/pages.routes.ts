import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env, WebAppPage } from '../../../../apps/engine/src/core/types'
import { savePage, listPages, getPage } from '../../../../apps/engine/src/lib/molecules/kv-page-manager'
import { authMiddleware } from '../../../../apps/engine/src/middleware/auth'

const app = new Hono<{ Bindings: Env }>()

// Schema for creating/updating a page
const pageSchema = z.object({
    id: z.string().min(3).regex(/^[a-z0-9-]+$/, 'ID deve conter apenas letras minúsculas, números e hífens'),
    name: z.string().min(1),
    html: z.string(),
    css: z.string(),
    js: z.string(),
})

// Create/Update Page
app.post('/api/pages', authMiddleware, zValidator('json', pageSchema), async (c) => {
    const tenant = c.get('tenant')
    const body = c.req.valid('json')

    if (!tenant) {
        return c.json({ success: false, error: 'Usuário não autenticado no contexto' }, 401)
    }

    // Auto-fill tenantId and timestamp
    const page: WebAppPage = {
        ...body,
        tenantId: tenant.tenantId,
        updatedAt: Date.now()
    }

    const result = await savePage(c.env, page)

    if (!result.success) {
        return c.json(result, 500)
    }

    return c.json(result)
})

// List Pages
app.get('/api/pages', authMiddleware, async (c) => {
    const tenant = c.get('tenant')

    if (!tenant) {
        return c.json({ success: false, error: 'Usuário não autenticado no contexto' }, 401)
    }

    const result = await listPages(c.env, tenant.tenantId)

    if (!result.success) {
        return c.json(result, 500)
    }

    return c.json(result)
})

// Get Single Page
app.get('/api/pages/:id', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const pageId = c.req.param('id')

    if (!tenant) {
        return c.json({ success: false, error: 'Usuário não autenticado no contexto' }, 401)
    }

    const result = await getPage(c.env, tenant.tenantId, pageId)

    if (!result.success) {
        return c.json(result, 404)
    }

    return c.json(result)
})

export { app as pagesRoutes }
