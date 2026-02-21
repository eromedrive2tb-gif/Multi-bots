/**
 * COMMAND HANDLER: Profile & Auth
 * Actions: UPDATE_PROFILE, UPDATE_PASSWORD, FETCH_ME, LOGOUT
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { AuthService } from '../../../../lib/organisms'

export const updateProfile: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new AuthService(env.DB)
    const result = await service.updateProfile(meta.userId, payload.name)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const updatePassword: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new AuthService(env.DB)
    const result = await service.updatePassword(meta.userId, payload.currentPassword, payload.newPassword)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const fetchMe: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const user = await env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(meta.userId).first()
    return { success: true, data: { user, tenantId: meta.tenantId } }
}

/**
 * LOGOUT is special: it returns `shouldClose: true` that the DO will use
 * to close the WebSocket after sending the response.
 */
export const logout: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new AuthService(env.DB)
    await service.logout(payload.sessionId)
    return { success: true, data: { __shouldClose: true } }
}
