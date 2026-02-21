/**
 * COMMAND HANDLER: Payment Gateways
 * Actions: FETCH_GATEWAYS, SAVE_GATEWAY, ADD_GATEWAY, DELETE_GATEWAY
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { PaymentService } from '../../../../lib/organisms/payments/PaymentService'

export const fetchGateways: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const gateways = await service.listGateways()
    return { success: true, data: gateways }
}

export const saveGateway: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const result = await service.addGateway(payload)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const deleteGateway: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const result = await service.removeGateway(payload.id)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}
