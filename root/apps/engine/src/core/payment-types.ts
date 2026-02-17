/**
 * PAYMENT TYPES
 * Tipos e schemas Zod para infraestrutura de pagamentos
 */

import { z } from 'zod'

// ============================================
// PAYMENT GATEWAY
// ============================================

export type PaymentGatewayProvider = 'mercadopago' | 'stripe' | 'pushinpay' | 'asaas' | 'mock'

export interface PaymentGateway {
    id: string
    tenantId: string
    name: string
    provider: PaymentGatewayProvider
    credentials: Record<string, string>
    isDefault: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export const addGatewaySchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    provider: z.enum(['mercadopago', 'stripe', 'pushinpay', 'asaas', 'mock']),
    credentials: z.record(z.string(), z.string()).refine(
        (creds) => Object.keys(creds).length > 0,
        'Credenciais são obrigatórias'
    ),
    isDefault: z.boolean().optional().default(false),
})

export type AddGatewayInput = z.infer<typeof addGatewaySchema>

// ============================================
// PLAN
// ============================================

export type PlanType = 'one_time' | 'subscription'

export interface Plan {
    id: string
    tenantId: string
    name: string
    description: string | null
    price: number // centavos
    currency: string
    type: PlanType
    intervalDays: number | null
    isActive: boolean
    metadata: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export const addPlanSchema = z.object({
    name: z.string().min(2, 'Nome do plano deve ter no mínimo 2 caracteres'),
    description: z.string().optional(),
    price: z.number().int().positive('Preço deve ser positivo (em centavos)'),
    currency: z.string().default('BRL'),
    type: z.enum(['one_time', 'subscription']),
    intervalDays: z.number().int().positive().optional(),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export type AddPlanInput = z.infer<typeof addPlanSchema>

// ============================================
// TRANSACTION
// ============================================

export type TransactionStatus = 'pending' | 'paid' | 'expired' | 'refunded' | 'cancelled'

export interface Transaction {
    id: string
    tenantId: string
    customerId: string | null
    gatewayId: string
    planId: string | null
    botId: string | null
    flowId: string | null
    externalId: string | null
    amount: number // centavos
    currency: string
    status: TransactionStatus
    paymentMethod: string
    pixCode: string | null
    pixQrcode: string | null
    metadata: Record<string, unknown>
    paidAt: string | null
    expiresAt: string | null
    createdAt: string
    updatedAt: string
}

// ============================================
// PIX GENERATION RESULT
// ============================================

export interface PixResult {
    transactionId: string
    externalId: string
    pixCode: string // copia-e-cola
    pixQrcode: string | null // base64
    amount: number
    expiresAt: string
}

// ============================================
// FINANCIAL SUMMARY
// ============================================

export interface FinancialSummary {
    totalGenerated: number // total PIX gerados (centavos)
    totalPaid: number // total PIX pagos (centavos)
    totalPending: number // total pendentes (centavos)
    totalRefunded: number
    countGenerated: number
    countPaid: number
    countPending: number
    countRefunded: number
    ticketMedio: number // centavos
    approvalRate: number // porcentagem 0-100
}
