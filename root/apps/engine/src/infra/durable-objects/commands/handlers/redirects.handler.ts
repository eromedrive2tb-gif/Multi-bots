/**
 * COMMAND HANDLER: Redirects
 * Actions: FETCH_REDIRECTS, FETCH_RED_STATS, CREATE_REDIRECT, DELETE_REDIRECT, UPDATE_REDIRECT
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { dbGetRedirects, dbGetRedirectStats, dbSaveRedirect, dbDeleteRedirect, dbUpdateRedirect } from '../../../../lib/atoms'

export const fetchRedirects: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await dbGetRedirects({ db: env.DB, tenantId: meta.tenantId })
    return { success: true, data: result }
}

export const fetchRedirectStats: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await dbGetRedirectStats(env.DB, meta.tenantId)
    return { success: true, data: result }
}

export const createRedirect: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    try {
        const result = await dbSaveRedirect({ db: env.DB, tenantId: meta.tenantId, ...payload })
        return { success: true, data: result }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export const deleteRedirect: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    try {
        await dbDeleteRedirect(env.DB, payload.id, meta.tenantId)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export const updateRedirect: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    try {
        const result = await dbUpdateRedirect({ db: env.DB, id: payload.id, tenantId: meta.tenantId, ...payload.data })
        return { success: true, data: result }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
