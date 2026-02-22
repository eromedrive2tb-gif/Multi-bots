/**
 * INFRASTRUCTURE: KV Page Repository
 * Handles persistence of WebApp Pages in Cloudflare KV.
 * 
 * Pattern: tenant:[tenantId]:page:[pageId]
 * 
 * Follows Repository Pattern with dependency injection (KVNamespace).
 * Optimized: stores page metadata in KV metadata to avoid N+1 reads on list.
 */

import type { WebAppPage, WebAppPageMeta } from '../domain/types'
import type { Result } from '../../../core/types'

// ============================================
// KEY HELPERS
// ============================================

const getPageKey = (tenantId: string, pageId: string): string =>
    `tenant:${tenantId}:page:${pageId}`

const getTenantPrefix = (tenantId: string): string =>
    `tenant:${tenantId}:page:`

// ============================================
// REPOSITORY CLASS
// ============================================

export class KvPageRepository {
    constructor(private readonly kv: KVNamespace) { }

    /**
     * Saves a page to KV.
     * Stores page metadata in KV metadata field for efficient list operations.
     * In singlefile mode, stores HTML as raw string value to avoid JSON double-serialization.
     */
    async save(page: WebAppPage): Promise<Result<WebAppPage>> {
        try {
            const key = getPageKey(page.tenantId, page.id)

            const meta: WebAppPageMeta = {
                id: page.id,
                name: page.name,
                mode: page.mode,
                tenantId: page.tenantId,
                updatedAt: page.updatedAt,
            }

            // Always store as JSON for consistency and full retrieval
            await this.kv.put(key, JSON.stringify(page), {
                metadata: meta,
            })

            return { success: true, data: page }
        } catch (error) {
            console.error('[KvPageRepository] Error saving page:', error)
            return { success: false, error: 'Falha ao salvar página' }
        }
    }

    /**
     * Gets a single page from KV by tenant + page ID.
     */
    async get(tenantId: string, pageId: string): Promise<Result<WebAppPage>> {
        try {
            const key = getPageKey(tenantId, pageId)
            const data = await this.kv.get<WebAppPage>(key, 'json')

            if (!data) {
                return { success: false, error: 'Página não encontrada' }
            }

            // Backward compatibility: pages without mode default to 'classic'
            if (!data.mode) {
                data.mode = 'classic'
            }

            return { success: true, data }
        } catch (error) {
            console.error('[KvPageRepository] Error fetching page:', error)
            return { success: false, error: 'Erro ao buscar página' }
        }
    }

    /**
     * Lists all pages for a tenant using KV metadata (no N+1 reads).
     * Falls back to full fetch if metadata is missing (backward compat).
     */
    async list(tenantId: string): Promise<Result<WebAppPageMeta[]>> {
        try {
            const prefix = getTenantPrefix(tenantId)
            const list = await this.kv.list<WebAppPageMeta>({ prefix })

            const pages: WebAppPageMeta[] = []

            for (const key of list.keys) {
                if (key.metadata) {
                    // Fast path: use metadata directly (no extra KV read)
                    pages.push(key.metadata)
                } else {
                    // Slow path (backward compat): fetch full page
                    const page = await this.kv.get<WebAppPage>(key.name, 'json')
                    if (page) {
                        pages.push({
                            id: page.id,
                            name: page.name,
                            mode: page.mode || 'classic',
                            tenantId: page.tenantId,
                            updatedAt: page.updatedAt,
                        })
                    }
                }
            }

            // Sort by update time (descending — newest first)
            pages.sort((a, b) => b.updatedAt - a.updatedAt)

            return { success: true, data: pages }
        } catch (error) {
            console.error('[KvPageRepository] Error listing pages:', error)
            return { success: false, error: 'Erro ao listar páginas' }
        }
    }

    /**
     * Deletes a page from KV.
     */
    async delete(tenantId: string, pageId: string): Promise<Result<void>> {
        try {
            const key = getPageKey(tenantId, pageId)
            await this.kv.delete(key)
            return { success: true, data: undefined }
        } catch (error) {
            console.error('[KvPageRepository] Error deleting page:', error)
            return { success: false, error: 'Erro ao deletar página' }
        }
    }
}
