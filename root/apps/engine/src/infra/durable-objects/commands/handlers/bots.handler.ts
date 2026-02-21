/**
 * COMMAND HANDLER: Bots
 * Actions: FETCH_BOTS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { BotManagerService } from '../../../../lib/organisms'

export const fetchBots: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, '')
    const bots = await manager.listBots()
    return { success: true, data: bots }
}
