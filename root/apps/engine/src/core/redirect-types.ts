/**
 * Redirect & Link Tracking Types
 * Zod schemas + TypeScript interfaces
 */

import { z } from 'zod'

export interface Redirect {
    id: string
    tenantId: string
    slug: string
    destinationUrl: string
    destinationType?: 'url' | 'bot'
    botId?: string | null
    flowId?: string | null
    domain: string
    cloakerEnabled: boolean
    cloakerMethod?: 'redirect' | 'safe_page' | 'mirror'
    cloakerSafeUrl: string | null
    pixelId?: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    totalClicks: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface RedirectClick {
    id: string
    redirectId: string
    ipAddress: string | null
    userAgent: string | null
    deviceType: 'mobile' | 'desktop' | 'tablet' | 'bot' | null
    referer: string | null
    country: string | null
    createdAt: string
}

export const createRedirectSchema = z.object({
    slug: z.string().min(1).regex(/^[a-z0-9-_]+$/i, 'Slug deve conter apenas letras, números, - e _'),
    destinationUrl: z.string().url('URL de destino inválida'),
    destinationType: z.enum(['url', 'bot']).default('url'),
    botId: z.string().optional(),
    flowId: z.string().optional(),
    domain: z.string().default('multibots.app'),
    cloakerEnabled: z.boolean().default(false),
    cloakerMethod: z.enum(['redirect', 'safe_page', 'mirror']).default('redirect'),
    cloakerSafeUrl: z.string().url().optional(),
    pixelId: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
})

export type CreateRedirectInput = z.infer<typeof createRedirectSchema>

export interface RedirectStats {
    totalLinks: number
    totalClicks: number
    withCloaker: number
    activeLinks: number
}
