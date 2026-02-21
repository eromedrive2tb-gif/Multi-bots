/**
 * COMMAND HANDLER: Redirects
 * Actions: FETCH_REDIRECTS, FETCH_RED_STATS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { dbGetRedirects, dbGetRedirectStats } from '../../../../lib/atoms'

export const fetchRedirects: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await dbGetRedirects({ db: env.DB, tenantId: meta.tenantId })
    return { success: true, data: result }
}

export const fetchRedirectStats: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await dbGetRedirectStats(env.DB, meta.tenantId)
    return { success: true, data: result }
}
