/**
 * COMMAND HANDLER: Customers
 * Actions: FETCH_CUSTOMERS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { dbGetCustomers } from '../../../../lib/atoms'

export const fetchCustomers: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const result = await dbGetCustomers({ db: env.DB, tenantId: meta.tenantId, ...payload })
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? (result as any).error : undefined
    }
}
