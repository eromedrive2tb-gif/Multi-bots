import { z } from 'zod'

// ============================================
// ENTITIES
// ============================================

export interface Customer {
    id: string
    tenantId: string
    externalId: string
    provider: 'tg' | 'dc'
    name: string | null
    username: string | null
    metadata: Record<string, any>
    lastInteraction: string
    createdAt: string
}

export type CustomerProvider = 'tg' | 'dc'

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
// CLOUDFLARE BINDINGS - see end of file
// ============================================

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
    username?: string
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
    token: z.string().trim().min(30, 'Token inválido'),
}).strict()

export const discordCredentialsSchema = z.object({
    applicationId: z.string().trim().min(10, 'Application ID inválido'),
    publicKey: z.string().trim().min(30, 'Public Key inválida'),
    token: z.string().trim().min(50, 'Token inválido'),
}).strict()

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

// ============================================
// UNIVERSAL ENGINE TYPES
// ============================================

/**
 * Provider types for the Universal Engine
 * 'tg' = Telegram, 'dc' = Discord, 'wa' = WhatsApp
 */
export type ProviderType = 'tg' | 'dc' | 'wa'

/**
 * Universal Context - Provider-agnostic execution context
 * Passed to all Engine operations
 */
export interface UniversalContext {
    provider: ProviderType
    tenantId: string
    userId: string
    chatId: string
    botToken: string
    botId: string // Database ID of the bot
    db?: D1Database // Optional database access for atoms/actions
    metadata: {
        userName?: string
        lastInput?: string
        command?: string
        raw?: unknown
        currentStepId?: string
        currentFlowId?: string
    }
    executionCtx?: ExecutionContext
    waitUntil?: (promise: Promise<any>) => void
}


/**
 * Session data stored in KV
 */
export interface SessionData {
    currentFlowId?: string
    currentStepId?: string
    collectedData: Record<string, unknown>
    lastActivity: number
}

// ============================================
// BLUEPRINT TYPES WITH ZOD SCHEMAS
// ============================================

export const blueprintStepTypeSchema = z.enum(['atom', 'molecule', 'organism'])

export type BlueprintStepType = z.infer<typeof blueprintStepTypeSchema>

export const blueprintStepSchema = z.object({
    type: blueprintStepTypeSchema,
    action: z.string().min(1),
    params: z.record(z.string(), z.unknown()).default({}),
    next_step: z.string().nullable().optional(),
    on_error: z.string().nullable().optional(),
})

export type BlueprintStep = z.infer<typeof blueprintStepSchema>

export const blueprintSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    trigger: z.string().min(1),
    entry_step: z.string().min(1),
    steps: z.record(z.string(), blueprintStepSchema),
    version: z.string().default('1.0'),
})

export type Blueprint = z.infer<typeof blueprintSchema>

export interface BlueprintListItem {
    id: string
    name: string
    trigger: string
    version: string
    isActive: boolean
    updatedAt: string | Date
}

// ============================================
// WEBAPP PAGES
// ============================================

export interface WebAppPage {
    id: string
    name: string
    html: string
    css: string
    js: string
    tenantId: string
    updatedAt: number
}

// ============================================
// RESULT PATTERN
// ============================================

export interface ResultSuccess<T> {
    success: true
    data: T
}

export interface ResultError {
    success: false
    error: string
}

export type Result<T> = ResultSuccess<T> | ResultError

// ============================================
// UPDATED CLOUDFLARE BINDINGS
// ============================================

export interface Env {
    DB: D1Database
    BLUEPRINTS_KV: KVNamespace
    SESSIONS_KV: KVNamespace
    PAGES_KV: KVNamespace
    AUTH_SECRET: string
    WEBHOOK_BASE_URL?: string  // Override webhook URL for production
}

// ============================================
// VIP GROUPS MANAGEMENT
// ============================================

export type VipGroupType = 'group' | 'channel' | 'community'

export interface VipGroup {
    id: string
    tenantId: string
    provider: BotProvider
    providerId: string // Chat ID or Guild ID
    name: string
    type: VipGroupType
    inviteLink?: string
    botId?: string
    metadata: Record<string, any>
    createdAt: string
    updatedAt: string
}

// ============================================
// VIP GROUPS ZOD SCHEMAS
// ============================================

export const createVipGroupSchema = z.object({
    provider: z.enum(['telegram', 'discord']),
    providerId: z.string().min(1, 'ID do provedor é obrigatório'),
    name: z.string().min(1, 'Nome é obrigatório'),
    type: z.enum(['group', 'channel', 'community']),
    inviteLink: z.string().optional(),
    botId: z.string().optional(),
    metadata: z.record(z.string(), z.any()).default({}),
})

export type CreateVipGroupDTO = z.infer<typeof createVipGroupSchema>

export const updateVipGroupSchema = createVipGroupSchema.partial()

export type UpdateVipGroupDTO = z.infer<typeof updateVipGroupSchema>
