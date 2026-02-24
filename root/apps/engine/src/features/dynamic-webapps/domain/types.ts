import { z } from 'zod'

// ============================================
// DYNAMIC WEBAPPS - DOMAIN TYPES
// Multi-Paradigm Rendering Engine
// ============================================

/**
 * Page rendering mode (4 categories):
 * - 'classic':      HTML + CSS + JS separados — o modo tradicional
 * - 'singlefile':   HTML completo (vite-plugin-singlefile output) — zero-overhead
 * - 'hypermedia': HTML + CSS + Head (Alpine.js and HTMX injected automatically)
 */
export type WebAppPageMode = 'classic' | 'singlefile' | 'hypermedia'

/**
 * WebAppPage Entity
 * Core domain model for dynamic webapps
 */
export interface WebAppPage {
    id: string
    name: string
    mode: WebAppPageMode
    /** Body HTML content (classic, hypermedia modes) */
    html: string
    /** Head HTML content for additional tags like scripts/meta (hypermedia mode) */
    head?: string
    /** CSS styles (classic, hypermedia modes) */
    css: string
    /** JavaScript code (classic mode only) */
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
    mode: WebAppPageMode | 'declarative' | 'htmx' | 'composed' // keeping legacy modes for safe frontend cast
    tenantId: string
    updatedAt: number
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const webAppPageModeSchema = z.enum(['classic', 'singlefile', 'hypermedia', 'declarative', 'htmx', 'composed'])

/** Shared base fields for all non-singlefile modes */
const basePageFields = {
    id: z.string().min(3).regex(/^[a-z0-9-]+$/, 'ID deve conter apenas letras minúsculas, números e hífens'),
    name: z.string().min(1, 'Nome é obrigatório'),
    html: z.string(),
    head: z.string().optional().default(''),
    css: z.string(),
    singleFileHtml: z.undefined().optional(),
}

/**
 * Classic mode: HTML + CSS + JS (traditional approach)
 */
const classicPageSchema = z.object({
    ...basePageFields,
    mode: z.literal('classic').default('classic'),
    js: z.string(),
})

/**
 * Singlefile mode: full HTML document (vite-plugin-singlefile)
 */
const singlefilePageSchema = z.object({
    id: z.string().min(3).regex(/^[a-z0-9-]+$/, 'ID deve conter apenas letras minúsculas, números e hífens'),
    name: z.string().min(1, 'Nome é obrigatório'),
    mode: z.literal('singlefile'),
    html: z.string().default(''),
    head: z.string().default(''),
    css: z.string().default(''),
    js: z.string().default(''),
    singleFileHtml: z.string().min(1, 'HTML do single file é obrigatório'),
})

/**
 * Hypermedia mode: HTML (Head + Body) + CSS (Alpine.js and HTMX injected by Engine)
 */
const hypermediaPageSchema = z.object({
    ...basePageFields,
    mode: z.literal('hypermedia'),
    js: z.string().default(''),
})

/**
 * Discriminated union schema: validates based on mode field
 */
export const webAppPageSchema = z.discriminatedUnion('mode', [
    classicPageSchema,
    singlefilePageSchema,
    hypermediaPageSchema,
])

export type WebAppPageInput = z.infer<typeof webAppPageSchema>
