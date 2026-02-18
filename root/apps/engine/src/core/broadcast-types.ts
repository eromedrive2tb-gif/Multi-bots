/**
 * Broadcast & Remarketing Types
 * Zod schemas + TypeScript interfaces
 */

import { z } from 'zod'

// ============================================
// BROADCAST
// ============================================

export const broadcastContentSchema = z.object({
    text: z.string().min(1, 'Texto é obrigatório'),
    media: z.object({
        type: z.enum(['photo', 'video', 'audio', 'document']),
        url: z.string().url(),
    }).optional(),
    buttons: z.array(z.object({
        text: z.string(),
        url: z.string().url().optional(),
        callback_data: z.string().optional(),
    })).optional(),
    parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).default('HTML'),
})

export type BroadcastContent = z.infer<typeof broadcastContentSchema>

export const broadcastStatusSchema = z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'])
export type BroadcastStatus = z.infer<typeof broadcastStatusSchema>

export const targetTypeSchema = z.enum(['channel', 'group', 'users'])
export type TargetType = z.infer<typeof targetTypeSchema>

export interface Broadcast {
    id: string
    tenantId: string
    botId: string
    title: string
    content: BroadcastContent
    targetType: TargetType
    targetId: string | null
    status: BroadcastStatus
    scheduledAt: string | null
    sentAt: string | null
    totalRecipients: number
    deliveredCount: number
    failedCount: number
    createdAt: string
    updatedAt: string
}

export const createBroadcastSchema = z.object({
    botId: z.string().uuid('Bot ID inválido'),
    title: z.string().min(1, 'Título é obrigatório'),
    content: broadcastContentSchema,
    targetType: targetTypeSchema,
    targetId: z.string().optional(),
    scheduledAt: z.string().optional(),
})

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>

// ============================================
// REMARKETING
// ============================================

export const segmentSchema = z.enum(['all', 'not_purchased', 'purchased', 'pix_recovery', 'expired', 'group_members'])
export type Segment = z.infer<typeof segmentSchema>

export const remarketingStatusSchema = z.enum(['draft', 'active', 'paused', 'completed'])
export type RemarketingStatus = z.infer<typeof remarketingStatusSchema>

export interface RemarketingCampaign {
    id: string
    tenantId: string
    name: string
    segment: Segment
    botId: string
    content: BroadcastContent
    status: RemarketingStatus
    filters: Record<string, unknown>
    totalTargeted: number
    totalSent: number
    totalFailed: number
    createdAt: string
    updatedAt: string
}

export const createCampaignSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    segment: segmentSchema,
    botId: z.string().uuid('Bot ID inválido'),
    content: broadcastContentSchema.optional(),
    flowId: z.string().optional(),
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional(), // HH:mm
    filters: z.record(z.string(), z.unknown()).default({}),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
