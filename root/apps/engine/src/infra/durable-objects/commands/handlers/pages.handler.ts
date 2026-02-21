/**
 * COMMAND HANDLER: WebApp Pages (KV)
 * Actions: FETCH_PAGES, SAVE_PAGE
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { savePage, listPages } from '../../../../lib/molecules/kv-page-manager'

export const fetchPages: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await listPages(env as any, meta.tenantId)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? (result as any).error : undefined
    }
}

export const savePageHandler: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const page = { ...payload, tenantId: meta.tenantId, updatedAt: Date.now() }
    const result = await savePage(env as any, page)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? (result as any).error : undefined
    }
}
