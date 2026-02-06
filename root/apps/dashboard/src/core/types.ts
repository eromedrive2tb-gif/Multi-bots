import { z } from 'zod'

// ============================================
// ENTITIES
// ============================================

export interface Tenant {
    id: string
    name: string
    email: string
    createdAt: Date
}

export interface User {
    id: string
    tenantId: string
    email: string
    name: string
    passwordHash: string
    createdAt: Date
}

export interface Session {
    id: string
    userId: string
    tenantId: string
    expiresAt: Date
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const registerSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

// ============================================
// CONTEXT TYPES
// ============================================

export interface TenantContext {
    tenantId: string
    userId: string
    user: {
        id: string
        name: string
        email: string
    }
}

// ============================================
// CLOUDFLARE BINDINGS
// ============================================

export interface Env {
    DB: D1Database
    AUTH_SECRET: string
}
