/**
 * COMMAND HANDLER: VIP Groups
 * Actions: FETCH_GROUPS, FETCH_GROUP, CREATE_GROUP, SAVE_VIP_GROUP,
 *          DELETE_GROUP, DELETE_VIP_GROUP, SYNC_GROUPS, SYNC_GROUP_MEMBERS,
 *          FETCH_GROUP_MEMBERS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { VipGroupService } from '../../../../lib/organisms'

export const fetchGroups: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = await service.listGroups()
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const fetchGroup: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = await service.getGroup(payload.id)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const saveVipGroup: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = payload.id
        ? await service.updateGroup(payload.id, payload)
        : await service.registerGroup(payload)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const deleteVipGroup: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = await service.deleteGroup(payload.id)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const syncGroups: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = await service.syncGroups()
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const syncGroupMembers: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = await service.syncGroupMembers(payload.groupId)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const fetchGroupMembers: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = await service.getGroupMembers(payload.groupId)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const kickMember: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new VipGroupService(env.DB, meta.tenantId)
    const result = await service.updateMemberStatus(payload.groupId, payload.customerId, 'kicked')
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}
