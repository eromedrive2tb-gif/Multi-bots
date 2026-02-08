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
    deleteSession,
    findUserById,
    updateUser,
    updatePassword
} from '../lib/auth'
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

        // Find user
        const user = await findUserByEmail(c.env.DB, email)
        if (!user) {
            return c.json({ success: false, error: "Email ou senha inválidos" }, 401)
        }

        // Verify password
        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) {
            return c.json({ success: false, error: "Email ou senha inválidos" }, 401)
        }

        // Create session
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        const sessionId = await createSession(c.env.DB, user.id, user.tenantId, expiresAt)

        setSessionCookie(c, sessionId)
        return c.json({ success: true, user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId } })

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

        // Check if email exists
        const existingUser = await findUserByEmail(c.env.DB, email)
        if (existingUser) {
            return c.json({ success: false, error: "Email já cadastrado" }, 409)
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
        return c.json({ success: true, user: { id: userId, email, name, tenantId } })

    } catch (error) {
        console.error('Register error:', error)
        return c.json({ success: false, error: "Erro ao criar conta. Tente novamente." }, 500)
    }
})

// Logout
authRoutes.post('/api/auth/logout', async (c) => {
    const sessionId = getCookie(c, 'session_id')
    if (sessionId) {
        await deleteSession(c.env.DB, sessionId)
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

    try {
        await updateUser(c.env.DB, tenant.user.id, { name })
        return c.json({ success: true })
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao atualizar perfil'
        }, 500)
    }
})

authRoutes.post('/api/settings/password', authMiddleware, async (c) => {
    const tenant = c.get('tenant')
    const { currentPassword, newPassword } = await c.req.json() as { currentPassword: string, newPassword: string }

    if (!currentPassword || !newPassword) {
        return c.json({ success: false, error: 'As senhas são obrigatórias' }, 400)
    }

    try {
        const user = await findUserById(c.env.DB, tenant.user.id)
        if (!user) {
            return c.json({ success: false, error: 'Usuário não encontrado' }, 404)
        }

        const isValid = await verifyPassword(currentPassword, user.passwordHash)
        if (!isValid) {
            return c.json({ success: false, error: 'Senha atual incorreta' }, 400)
        }

        const newHash = await hashPassword(newPassword)
        await updatePassword(c.env.DB, user.id, newHash)

        return c.json({ success: true })
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao alterar senha'
        }, 500)
    }
})

export { authRoutes }
