/**
 * Dynamic WebApps Feature Module - Barrel Export
 * 
 * Re-exports all public API from the feature for external consumers.
 */

// Domain
export type { WebAppPage, WebAppPageMeta, WebAppPageMode, WebAppPageInput } from './domain/types'
export { webAppPageSchema, webAppPageModeSchema } from './domain/types'
export { assembleHtml, getServeHeaders } from './domain/html-assembler'
export { escapeHtml, sanitizeCss, auditJs } from './domain/html-sanitizer'

// Infrastructure
export { KvPageRepository } from './infrastructure/kv-page-repository'

// Interface
export { webappsController } from './interface/webapps.controller'
