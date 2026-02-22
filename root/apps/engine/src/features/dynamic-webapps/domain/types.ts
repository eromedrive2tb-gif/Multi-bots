import { z } from 'zod'

// ============================================
// DYNAMIC WEBAPPS - DOMAIN TYPES
// ============================================

/**
 * Page rendering mode:
 * - 'composed': HTML, CSS, JS stored separately and assembled at serve time
 * - 'singlefile': Full HTML document stored as-is (vite-plugin-singlefile output)
 */
export type WebAppPageMode = 'composed' | 'singlefile'

/**
 * WebAppPage Entity
 * Core domain model for dynamic webapps
 */
export interface WebAppPage {
    id: string
    name: string
    mode: WebAppPageMode
    /** Body HTML content (composed mode) */
    html: string
    /** CSS styles (composed mode) */
    css: string
    /** JavaScript code (composed mode) */
    js: string
    /** Full HTML document (singlefile mode — vite-plugin-singlefile output) */
    singleFileHtml?: string
    tenantId: string
    updatedAt: number
}

/**
 * Lightweight metadata for list operations (avoids N+1 KV reads)
 */
export interface WebAppPageMeta {
    id: string
    name: string
    mode: WebAppPageMode
    tenantId: string
    updatedAt: number
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const webAppPageModeSchema = z.enum(['composed', 'singlefile'])

/**
 * Schema for composed mode pages (HTML + CSS + JS separately)
 */
const composedPageSchema = z.object({
    id: z.string().min(3).regex(/^[a-z0-9-]+$/, 'ID deve conter apenas letras minúsculas, números e hífens'),
    name: z.string().min(1, 'Nome é obrigatório'),
    mode: z.literal('composed').default('composed'),
    html: z.string(),
    css: z.string(),
    js: z.string(),
    singleFileHtml: z.undefined().optional(),
})

/**
 * Schema for singlefile mode pages (full HTML document)
 */
const singlefilePageSchema = z.object({
    id: z.string().min(3).regex(/^[a-z0-9-]+$/, 'ID deve conter apenas letras minúsculas, números e hífens'),
    name: z.string().min(1, 'Nome é obrigatório'),
    mode: z.literal('singlefile'),
    html: z.string().default(''),
    css: z.string().default(''),
    js: z.string().default(''),
    singleFileHtml: z.string().min(1, 'HTML do single file é obrigatório'),
})

/**
 * Discriminated union schema: validates based on mode field
 */
export const webAppPageSchema = z.discriminatedUnion('mode', [
    composedPageSchema,
    singlefilePageSchema,
])

export type WebAppPageInput = z.infer<typeof webAppPageSchema>
