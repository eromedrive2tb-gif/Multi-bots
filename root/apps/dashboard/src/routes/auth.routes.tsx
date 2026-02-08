/**
 * AUTH ROUTES
 * Handles authentication: login, register, logout
 * Follows SRP - Single Responsibility for auth endpoints
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { loginSchema, registerSchema } from '../core/types'
import { AuthService } from '../lib/organisms/AuthService'
import { setSessionCookie, clearSessionCookie, authMiddleware } from '../middleware/auth'
import { getCookie } from 'hono/cookie'

// Pages
import { LoginPage } from '../pages/login'
import { RegisterPage } from '../pages/register'

const authRoutes = new Hono<{ Bindings: Env }>()

// ============================================
// AUTH API
// ============================================

// Login
authRoutes.post('/api/auth/login', async (c) => {
    try {
        const body = await c.req.json()
        const { email, password } = body

        // Validate input
        const result = loginSchema.safeParse({ email, password })
        if (!result.success) {
            return c.json({ success: false, error: "Email ou senha inválidos" }, 400)
        }

        const authService = new AuthService(c.env.DB)
        const loginResult = await authService.login(email, password)

        if (!loginResult.success || !loginResult.user || !loginResult.sessionId) {
            return c.json({ success: false, error: loginResult.error || "Login falhou" }, 401)
        }

        setSessionCookie(c, loginResult.sessionId)
        return c.json({ success: true, user: loginResult.user })

    } catch (error) {
        console.error('Login error:', error)
        return c.json({ success: false, error: "Erro ao fazer login. Tente novamente." }, 500)
    }
})

// Register
authRoutes.post('/api/auth/register', async (c) => {
    try {
        const body = await c.req.json()
        const { name, email, password, confirmPassword } = body

        // Validate input
        const result = registerSchema.safeParse({ name, email, password, confirmPassword })
        if (!result.success) {
            const error = result.error.errors[0]?.message || 'Dados inválidos'
            return c.json({ success: false, error }, 400)
        }

        const authService = new AuthService(c.env.DB)
        const registerResult = await authService.register(name, email, password)

        if (!registerResult.success || !registerResult.user || !registerResult.sessionId) {
            return c.json({ success: false, error: registerResult.error || "Registro falhou" }, 409)
        }

        setSessionCookie(c, registerResult.sessionId)
        return c.json({ success: true, user: registerResult.user })

    } catch (error) {
        console.error('Register error:', error)
        return c.json({ success: false, error: "Erro ao criar conta. Tente novamente." }, 500)
    }
})

// Logout
authRoutes.post('/api/auth/logout', async (c) => {
    const sessionId = getCookie(c, 'session_id')
    if (sessionId) {
        const authService = new AuthService(c.env.DB)
        await authService.logout(sessionId)
    }
    clearSessionCookie(c)
    return c.json({ success: true })
})

// Me (Get current user/tenant)
authRoutes.get('/api/auth/me', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    return c.json({
        success: true,
        data: {
            user: tenant.user,
            tenantId: tenant.tenantId
        }
    })
})

authRoutes.post('/api/settings/profile', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const { name } = await c.req.json() as { name: string }

    if (!name) {
        return c.json({ success: false, error: 'Nome é obrigatório' }, 400)
    }

    const authService = new AuthService(c.env.DB)
    const result = await authService.updateProfile(tenant.user.id, name)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true })
})

authRoutes.post('/api/settings/password', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const { currentPassword, newPassword } = await c.req.json() as { currentPassword: string, newPassword: string }

    if (!currentPassword || !newPassword) {
        return c.json({ success: false, error: 'As senhas são obrigatórias' }, 400)
    }

    const authService = new AuthService(c.env.DB)
    const result = await authService.updatePassword(tenant.user.id, currentPassword, newPassword)

    if (!result.success) {
        return c.json({ success: false, error: result.error }, 400)
    }

    return c.json({ success: true })
})

export { authRoutes }
