/**
 * COMMAND HANDLER: Bots
 * Actions: FETCH_BOTS, ADD_BOT, DELETE_BOT, CHECK_BOT_HEALTH, REGISTER_BOT,
 *          FETCH_BOT_BLUEPRINTS, TOGGLE_BOT_BLUEPRINT, SYNC_BOT_COMMANDS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { BotManagerService } from '../../../../lib/organisms'
import { BlueprintService } from '../../../../lib/organisms/blueprints/BlueprintService'

export const fetchBots: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, '')
    const bots = await manager.listBots()
    return { success: true, data: bots }
}

export const addBot: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, (env as any).WEBHOOK_BASE_URL || '')
    const result = await manager.addBot(payload.name, payload.provider, payload.credentials)
    return {
        success: result.success,
        data: result.success ? result.bot : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const deleteBot: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, '')
    const result = await manager.removeBot(payload.id)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const checkBotHealth: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, '')
    const result = await manager.checkBotHealth(payload.id)
    return {
        success: result.success,
        data: result.success ? { status: result.status } : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const registerBot: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, (env as any).WEBHOOK_BASE_URL || '')
    const result = await manager.setBotWebhook(payload.id)
    return {
        success: result.success,
        data: result.success ? { webhookUrl: result.webhookUrl } : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const fetchBotBlueprints: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const bpService = new BlueprintService(env.DB, env.BLUEPRINTS_KV, meta.tenantId)
    const allBpsResult = await bpService.listBlueprints(true)
    if (!allBpsResult.success || !allBpsResult.data) {
        return { success: false, error: (allBpsResult as any).error || 'Failed to fetch blueprints' }
    }

    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, '')
    const botBpsResult = await manager.getBotBlueprints(payload.botId)
    if (!botBpsResult.success || !botBpsResult.data) {
        return { success: false, error: (botBpsResult as any).error || 'Failed to fetch bot blueprints status' }
    }

    const statusMap = new Map(botBpsResult.data.map((s: any) => [s.blueprintId, s.isActive]))

    const combined = allBpsResult.data.map((bp: any) => ({
        ...bp,
        isActive: statusMap.get(bp.id) || false
    }))

    return { success: true, data: combined }
}

export const toggleBotBlueprint: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, '')
    const result = await manager.toggleBotBlueprint(payload.botId, payload.blueprintId, payload.isActive)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const syncBotCommands: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const manager = new BotManagerService(env.DB, env.BLUEPRINTS_KV, meta.tenantId, '')
    const result = await manager.syncBotCommands(payload.id, env.BLUEPRINTS_KV)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}
