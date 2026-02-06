import { createMiddleware } from 'hono/factory'
import type { Context, Next } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { findValidSession, findUserById } from '../lib/auth'
import type { TenantContext, Env } from '../core/types'

// Session cookie name
const SESSION_COOKIE = 'session_id'

// Extend Hono context with tenant info
declare module 'hono' {
    interface ContextVariableMap {
        tenant: TenantContext
    }
}

// Auth middleware - verifies session and injects tenant context
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const sessionId = getCookie(c, SESSION_COOKIE)

    if (!sessionId) {
        return c.redirect('/login')
    }

    const session = await findValidSession(c.env.DB, sessionId)

    if (!session) {
        deleteCookie(c, SESSION_COOKIE)
        return c.redirect('/login')
    }

    const user = await findUserById(c.env.DB, session.userId)

    if (!user) {
        deleteCookie(c, SESSION_COOKIE)
        return c.redirect('/login')
    }

    // Inject tenant context
    c.set('tenant', {
        tenantId: session.tenantId,
        userId: user.id,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        }
    })

    await next()
})

// Helper to set session cookie
export function setSessionCookie(c: Context, sessionId: string) {
    setCookie(c, SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    })
}

// Helper to clear session cookie
export function clearSessionCookie(c: Context) {
    deleteCookie(c, SESSION_COOKIE)
}
