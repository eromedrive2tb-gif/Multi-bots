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

// ============================================
// BOT MANAGEMENT
// ============================================

export type BotProvider = 'telegram' | 'discord'
export type BotStatus = 'online' | 'offline' | 'error'

export interface TelegramCredentials {
    token: string
}

export interface DiscordCredentials {
    applicationId: string
    publicKey: string
    token: string
}

export type BotCredentials = TelegramCredentials | DiscordCredentials

export interface Bot {
    id: string
    tenantId: string
    name: string
    provider: BotProvider
    credentials: BotCredentials
    status: BotStatus
    statusMessage?: string
    lastCheck?: Date
    webhookSecret?: string
    createdAt: Date
    updatedAt: Date
}

export interface BotInfo {
    id: number | string
    username?: string
    name: string
    isValid: boolean
}

// ============================================
// BOT ZOD SCHEMAS
// ============================================

export const telegramCredentialsSchema = z.object({
    token: z.string().min(30, 'Token inválido'),
})

export const discordCredentialsSchema = z.object({
    applicationId: z.string().min(10, 'Application ID inválido'),
    publicKey: z.string().min(30, 'Public Key inválida'),
    token: z.string().min(50, 'Token inválido'),
})

export const addBotSchema = z.object({
    name: z.string().min(2, 'Nome do bot deve ter no mínimo 2 caracteres'),
    provider: z.enum(['telegram', 'discord']),
    credentials: z.union([telegramCredentialsSchema, discordCredentialsSchema]),
})

export type AddBotInput = z.infer<typeof addBotSchema>

// ============================================
// GENERIC MESSAGE (Provider Abstraction)
// ============================================

export interface GenericMessage {
    id: string
    chatId: string
    text: string
    from: {
        id: string
        name: string
        username?: string
    }
    timestamp: Date
    provider: BotProvider
    raw: unknown
}
