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

    // Validate body
    const parseResult = createRedirectSchema.safeParse(body)
    if (!parseResult.success) {
        return c.json({
            success: false,
            error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')
        }, 400)
    }

    // Additional logic: If destinationType is 'bot', botId and flowId validation could happen here.
    // For now, we trust the client or db constraints (if any).

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
        let deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' = 'desktop'
        if (/bot|crawler|spider|slurp|mediapartners|facebookexternalhit/i.test(ua)) deviceType = 'bot'
        else if (/mobile|android|iphone|ipad|ipod/i.test(ua)) deviceType = 'mobile'
        else if (/tablet/i.test(ua)) deviceType = 'tablet'

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

        // CLOAKER LOGIC
        if (redirect.cloakerEnabled && deviceType === 'bot') {
            // Logic for bots/crawlers when cloaker is ON
            if (redirect.cloakerMethod === 'safe_page') {
                // Return Safe Page HTML (Fake content)
                return c.html(`
                    <!DOCTYPE html>
                    <html lang="pt-BR">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Bem-vindo</title>
                        <style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f2f5; } .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; text-align: center; } h1 { color: #333; margin-bottom: 0.5rem; } p { color: #666; line-height: 1.5; }</style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Pagina em Manutenção</h1>
                            <p>Estamos realizando melhorias em nosso sistema. Por favor, volte mais tarde.</p>
                        </div>
                    </body>
                    </html>
                `)
            } else if (redirect.cloakerMethod === 'redirect' && redirect.cloakerSafeUrl) {
                // Redirect to Safe URL
                return c.redirect(redirect.cloakerSafeUrl, 302)
            }
            // 'mirror' method not implemented for now (complex proxy), fallback to safe page or redirect behavior?
            // Fallback to standard flow if no safe url or method unknown, but usually we want to block.
            // Let's just standard flow if config is missing, but logged as bot.
        }

        // STANDARD REDIRECT LOGIC
        let finalUrl = ''

        if (redirect.destinationType === 'bot') {
            // Construct Telegram Deep Link
            // We need the bot username. Fetch from DB? Or client passed it?
            // Client only passed botId. We need to fetch Bot Profile.
            // Optimization: Maybe store bot_username in redirects table or fetch it here.
            // Fetching here:
            const bot = await c.env.DB.prepare('SELECT credentials FROM bots WHERE id = ?').bind(redirect.botId).first<{ credentials: string }>()
            let botUsername = 'bot'
            if (bot) {
                try {
                    const creds = JSON.parse(bot.credentials)
                    // If username not stored, we might have an issue. Usually it is token.
                    // Ideally we should have username in bots table. For now let's assume we can get it or fail.
                    // Actually, deep links can be: https://t.me/USERNAME?start=flow_FLOWID
                    // If we don't have username, we can't deep link properly.
                    // Let's assume for now we might need to add username to bots table or extract from token (not possible).
                    // Workaround: Use a known username or fetch 'getMe' if cached? No.
                    // Real solution: Add username to bots table or trust client to send full link?
                    // "destinationUrl" could be used to store the generated link?
                    // IF type is bot, destinationUrl might already be pre-filled by frontend?
                    // Let's use destinationUrl if available, otherwise try to construct.
                    // Protocol: Frontend constructs t.me link and saves in destinationUrl?
                    // The plan said "Logic to fetch Bot username".
                    // Let's rely on destinationUrl being the base if populated.
                } catch { }
            }

            // If destinationUrl is populated (e.g. t.me/...), use it and append params.
            // If it's a raw link, proceed.
            finalUrl = redirect.destinationUrl
            // If flowId is present and url doesn't have start param, append it?
            // Assuming frontend saves "https://t.me/MyBot" in destinationUrl.
            if (redirect.flowId && !finalUrl.includes('start=')) {
                const separator = finalUrl.includes('?') ? '&' : '?'
                finalUrl = `${finalUrl}${separator}start=flow_${redirect.flowId}`
            }

        } else {
            // URL Destination
            finalUrl = redirect.destinationUrl
        }

        // Append UTMs
        const urlObj = new URL(finalUrl)
        if (redirect.utmSource) urlObj.searchParams.set('utm_source', redirect.utmSource)
        if (redirect.utmMedium) urlObj.searchParams.set('utm_medium', redirect.utmMedium)
        if (redirect.utmCampaign) urlObj.searchParams.set('utm_campaign', redirect.utmCampaign)
        // Append extra query params from current request? (Pass-through)
        const currentUrl = new URL(c.req.url)
        currentUrl.searchParams.forEach((val, key) => {
            if (!urlObj.searchParams.has(key)) urlObj.searchParams.set(key, val)
        })

        return c.redirect(urlObj.toString(), 302)

    } catch (error) {
        console.error('Redirect Error:', error)
        return c.text('Erro interno no redirecionamento', 500)
    }
})

export { redirectRoutes }
