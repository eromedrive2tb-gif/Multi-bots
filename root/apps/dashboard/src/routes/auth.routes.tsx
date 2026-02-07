/**
 * AUTH ROUTES
 * Handles authentication: login, register, logout
 * Follows SRP - Single Responsibility for auth endpoints
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { loginSchema, registerSchema } from '../core/types'
import {
    hashPassword,
    verifyPassword,
    findUserByEmail,
    createTenant,
    createUser,
    createSession,
    deleteSession
} from '../lib/auth'
import { setSessionCookie, clearSessionCookie, authMiddleware } from '../middleware/auth'
import { getCookie } from 'hono/cookie'

// Pages
import { LoginPage } from '../pages/login'
import { RegisterPage } from '../pages/register'

const authRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// PUBLIC PAGES
// ============================================

authRoutes.get('/login', async (c) => {
    // Check if already logged in
    const sessionId = getCookie(c, 'session_id')
    if (sessionId) {
        const { findValidSession } = await import('../lib/auth')
        const session = await findValidSession(c.env.DB, sessionId)
        if (session) {
            return c.redirect('/dashboard')
        }
    }
    return c.render(<LoginPage />)
})

authRoutes.get('/register', async (c) => {
    const sessionId = getCookie(c, 'session_id')
    if (sessionId) {
        const { findValidSession } = await import('../lib/auth')
        const session = await findValidSession(c.env.DB, sessionId)
        if (session) {
            return c.redirect('/dashboard')
        }
    }
    return c.render(<RegisterPage />)
})

// ============================================
// AUTH API
// ============================================

// Login
authRoutes.post('/api/auth/login', async (c) => {
    try {
        const formData = await c.req.formData()
        const email = formData.get('email')?.toString() || ''
        const password = formData.get('password')?.toString() || ''

        // Validate input
        const result = loginSchema.safeParse({ email, password })
        if (!result.success) {
            return c.render(<LoginPage error="Email ou senha inválidos" />)
        }

        // Find user
        const user = await findUserByEmail(c.env.DB, email)
        if (!user) {
            return c.render(<LoginPage error="Email ou senha inválidos" />)
        }

        // Verify password
        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) {
            return c.render(<LoginPage error="Email ou senha inválidos" />)
        }

        // Create session
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        const sessionId = await createSession(c.env.DB, user.id, user.tenantId, expiresAt)

        setSessionCookie(c, sessionId)
        return c.redirect('/dashboard')

    } catch (error) {
        console.error('Login error:', error)
        return c.render(<LoginPage error="Erro ao fazer login. Tente novamente." />)
    }
})

// Register
authRoutes.post('/api/auth/register', async (c) => {
    try {
        const formData = await c.req.formData()
        const name = formData.get('name')?.toString() || ''
        const email = formData.get('email')?.toString() || ''
        const password = formData.get('password')?.toString() || ''
        const confirmPassword = formData.get('confirmPassword')?.toString() || ''

        // Validate input
        const result = registerSchema.safeParse({ name, email, password, confirmPassword })
        if (!result.success) {
            const error = result.error.errors[0]?.message || 'Dados inválidos'
            return c.render(<RegisterPage error={error} />)
        }

        // Check if email exists
        const existingUser = await findUserByEmail(c.env.DB, email)
        if (existingUser) {
            return c.render(<RegisterPage error="Email já cadastrado" />)
        }

        // Create tenant
        const tenantId = await createTenant(c.env.DB, name, email)

        // Create user
        const passwordHash = await hashPassword(password)
        const userId = await createUser(c.env.DB, tenantId, email, name, passwordHash)

        // Create session
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const sessionId = await createSession(c.env.DB, userId, tenantId, expiresAt)

        setSessionCookie(c, sessionId)
        return c.redirect('/dashboard')

    } catch (error) {
        console.error('Register error:', error)
        return c.render(<RegisterPage error="Erro ao criar conta. Tente novamente." />)
    }
})

// Logout
authRoutes.post('/api/auth/logout', async (c) => {
    const sessionId = getCookie(c, 'session_id')
    if (sessionId) {
        await deleteSession(c.env.DB, sessionId)
    }
    clearSessionCookie(c)
    return c.redirect('/login')
})

export { authRoutes }
