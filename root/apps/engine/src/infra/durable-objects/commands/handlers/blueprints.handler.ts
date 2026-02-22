/**
 * COMMAND HANDLER: Blueprints
 * Actions: FETCH_BLUEPRINTS, FETCH_BLUEPRINT, SAVE_BLUEPRINT
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { BlueprintService } from '../../../../lib/organisms'

export const fetchBlueprints: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BlueprintService(env.DB, env.BLUEPRINTS_KV, meta.tenantId)
    const result = await service.listBlueprints()
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const fetchBlueprint: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BlueprintService(env.DB, env.BLUEPRINTS_KV, meta.tenantId)
    const result = await service.getBlueprint(payload.id)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const saveBlueprint: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BlueprintService(env.DB, env.BLUEPRINTS_KV, meta.tenantId)
    const result = await service.saveBlueprint(payload)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const deleteBlueprint: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BlueprintService(env.DB, env.BLUEPRINTS_KV, meta.tenantId)
    const result = await service.deleteBlueprint(payload.id)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}
