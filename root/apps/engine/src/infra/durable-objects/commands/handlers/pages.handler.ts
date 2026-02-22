/**
 * COMMAND HANDLER: WebApp Pages (KV)
 * Actions: FETCH_PAGES, SAVE_PAGE
 * 
 * Uses KvPageRepository from the dynamic-webapps feature module.
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { KvPageRepository } from '../../../../features/dynamic-webapps'

export const fetchPages: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const repo = new KvPageRepository((env as Env).PAGES_KV)
    const result = await repo.list(meta.tenantId)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? (result as any).error : undefined
    }
}

export const savePageHandler: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const repo = new KvPageRepository((env as Env).PAGES_KV)
    const page = {
        ...payload,
        mode: payload.mode || 'composed',
        tenantId: meta.tenantId,
        updatedAt: Date.now(),
    }
    const result = await repo.save(page as any)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? (result as any).error : undefined
    }
}
export const deletePageHandler: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const repo = new KvPageRepository((env as Env).PAGES_KV)
    const pageId = String(payload.id || '')
    const result = await repo.delete(meta.tenantId, pageId)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? (result as any).error : undefined
    }
}
