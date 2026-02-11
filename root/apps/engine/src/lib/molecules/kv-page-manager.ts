import type { Env, WebAppPage } from '../../core/types'
import type { Result } from '../../core/types'

/**
 * MOLECULE: KV Page Manager
 * Handles persistence of WebApp Pages in Cloudflare KV
 * Pattern: tenant:[tenantId]:page:[pageId]
 */

const getPageKey = (tenantId: string, pageId: string) => `tenant:${tenantId}:page:${pageId}`
const getTenantPrefix = (tenantId: string) => `tenant:${tenantId}:page:`

/**
 * Saves a page to KV
 */
export async function savePage(
    env: Env,
    page: WebAppPage
): Promise<Result<WebAppPage>> {
    try {
        const key = getPageKey(page.tenantId, page.id)
        await env.PAGES_KV.put(key, JSON.stringify(page))
        return { success: true, data: page }
    } catch (error) {
        console.error('[KV] Error saving page:', error)
        return { success: false, error: 'Falha ao salvar página' }
    }
}

/**
 * Gets a page from KV
 */
export async function getPage(
    env: Env,
    tenantId: string,
    pageId: string
): Promise<Result<WebAppPage>> {
    try {
        const key = getPageKey(tenantId, pageId)
        const data = await env.PAGES_KV.get<WebAppPage>(key, 'json')

        if (!data) {
            return { success: false, error: 'Página não encontrada' }
        }

        return { success: true, data }
    } catch (error) {
        console.error('[KV] Error fetching page:', error)
        return { success: false, error: 'Erro ao buscar página' }
    }
}

/**
 * Lists all pages for a tenant
 */
export async function listPages(
    env: Env,
    tenantId: string
): Promise<Result<WebAppPage[]>> {
    try {
        const prefix = getTenantPrefix(tenantId)
        const list = await env.PAGES_KV.list({ prefix })

        const pages: WebAppPage[] = []

        // Parallel fetch of all pages
        // Note: For large lists, we might want to paginate or store a separate index
        // But for this use case (mini-apps), direct fetch consists of a few items
        await Promise.all(
            list.keys.map(async (key) => {
                const page = await env.PAGES_KV.get<WebAppPage>(key.name, 'json')
                if (page) pages.push(page)
            })
        )

        // Sort by update time (descending)
        pages.sort((a, b) => b.updatedAt - a.updatedAt)

        return { success: true, data: pages }
    } catch (error) {
        console.error('[KV] Error listing pages:', error)
        return { success: false, error: 'Erro ao listar páginas' }
    }
}

/**
 * Deletes a page from KV
 */
export async function deletePage(
    env: Env,
    tenantId: string,
    pageId: string
): Promise<Result<void>> {
    try {
        const key = getPageKey(tenantId, pageId)
        await env.PAGES_KV.delete(key)
        return { success: true, data: undefined }
    } catch (error) {
        console.error('[KV] Error deleting page:', error)
        return { success: false, error: 'Erro ao deletar página' }
    }
}
