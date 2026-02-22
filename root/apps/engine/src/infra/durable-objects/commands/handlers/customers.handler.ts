/**
 * COMMAND HANDLER: Customers
 * Actions: FETCH_CUSTOMERS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { dbGetCustomers, dbClearCustomers, dbGetCustomerHistory } from '../../../../lib/atoms'
import { kvClearTenantSessions } from '../../../../lib/molecules/kv/kv-session-manager'

export const fetchCustomers: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await dbGetCustomers({ db: env.DB, tenantId: meta.tenantId, ...payload })
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? (result as any).error : undefined
    }
}

export const clearCustomers: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    // Stage 1: Clear SQL Database (D1)
    const dbResult = await dbClearCustomers({ db: env.DB, tenantId: meta.tenantId })
    if (!dbResult.success) return { success: false, error: dbResult.error }

    // Stage 2: Clear Session KV (Cloudflare KV)
    // This removes "Captured Data" and active flow states
    const kvResult = await kvClearTenantSessions(env.SESSIONS_KV, meta.tenantId)

    return {
        success: kvResult.success,
        data: undefined,
        error: !kvResult.success ? kvResult.error : undefined
    }
}

export const fetchCustomerHistory: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await dbGetCustomerHistory({ db: env.DB, tenantId: meta.tenantId, customerId: payload.customerId })
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}
