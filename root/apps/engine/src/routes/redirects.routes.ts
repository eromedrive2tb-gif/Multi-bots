/**
 * REDIRECTS ROUTES
 * CRUD for redirect links + public redirect endpoint + stats
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { createRedirectSchema } from '../core/redirect-types'
import { authMiddleware } from '../middleware/auth'
import {
    dbSaveRedirect, dbGetRedirects, dbDeleteRedirect,
    dbGetRedirectBySlug, dbTrackClick, dbGetRedirectStats
} from '../lib/atoms/database/db-redirects'

const redirectRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// AUTHENTICATED MANAGEMENT ENDPOINTS
// ============================================

redirectRoutes.get('/api/redirects', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    try {
        const redirects = await dbGetRedirects({ db: c.env.DB, tenantId: tenant.tenantId })
        return c.json({ success: true, data: redirects })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

redirectRoutes.get('/api/redirects/stats', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    try {
        const stats = await dbGetRedirectStats(c.env.DB, tenant.tenantId)
        return c.json({ success: true, data: stats })
    } catch (error) {
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500)
    }
})

redirectRoutes.post('/api/redirects', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const body = await c.req.json()

    const parseResult = createRedirectSchema.safeParse(body)
    if (!parseResult.success) {
        return c.json({
            success: false,
            error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
        }, 400)
    }

    try {
        const id = crypto.randomUUID()
        const redirect = await dbSaveRedirect({
            db: c.env.DB, id, tenantId: tenant.tenantId, ...parseResult.data,
        })
        return c.json({ success: true, data: redirect })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro'
        if (msg.includes('UNIQUE')) return c.json({ success: false, error: 'Slug já em uso' }, 409)
        return c.json({ success: false, error: msg }, 500)
    }
})

redirectRoutes.post('/api/redirects/:id/delete', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const deleted = await dbDeleteRedirect(c.env.DB, c.req.param('id'), tenant.tenantId)
    if (!deleted) return c.json({ success: false, error: 'Link não encontrado' }, 404)
    return c.json({ success: true })
})

// ============================================
// PUBLIC REDIRECT ENDPOINT
// ============================================

redirectRoutes.get('/r/:slug', async (c) => {
    const slug = c.req.param('slug')

    try {
        const redirect = await dbGetRedirectBySlug(c.env.DB, slug)
        if (!redirect) return c.text('Link não encontrado', 404)

        // Detect device type from user-agent
        const ua = c.req.header('user-agent') || ''
        let deviceType: string = 'desktop'
        if (/bot|crawler|spider|slurp|mediapartners/i.test(ua)) deviceType = 'bot'
        else if (/mobile|android|iphone|ipad|ipod/i.test(ua)) deviceType = 'mobile'
        else if (/tablet/i.test(ua)) deviceType = 'tablet'

        // If cloaker enabled and request is from a bot, serve safe URL
        if (redirect.cloakerEnabled && deviceType === 'bot' && redirect.cloakerSafeUrl) {
            return c.redirect(redirect.cloakerSafeUrl, 302)
        }

        // Track click asynchronously
        c.executionCtx.waitUntil(
            dbTrackClick({
                db: c.env.DB, redirectId: redirect.id,
                ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
                userAgent: ua, deviceType,
                referer: c.req.header('referer'),
                country: c.req.header('cf-ipcountry'),
            })
        )

        // Build destination with UTM params
        const url = new URL(redirect.destinationUrl)
        if (redirect.utmSource) url.searchParams.set('utm_source', redirect.utmSource)
        if (redirect.utmMedium) url.searchParams.set('utm_medium', redirect.utmMedium)
        if (redirect.utmCampaign) url.searchParams.set('utm_campaign', redirect.utmCampaign)

        return c.redirect(url.toString(), 302)
    } catch (error) {
        return c.text('Erro interno', 500)
    }
})

export { redirectRoutes }
