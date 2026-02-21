/**
 * COMMAND HANDLER: Payments (Plans & Transactions)
 * Actions: FETCH_PAYMENTS_SUMMARY, FETCH_PAYMENTS_PLANS, FETCH_PLANS,
 *          CREATE_PLAN, ADD_PLAN, DELETE_PLAN,
 *          FETCH_PAYMENTS_TRANSACTIONS, FETCH_TRANSACTIONS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { PaymentService } from '../../../../lib/organisms/payments/PaymentService'

export const fetchPaymentsSummary: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const result = await service.getFinancialSummary(payload?.period || 'month')
    return { success: true, data: result }
}

export const fetchPlans: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const plans = await service.listPlans(payload?.activeOnly)
    return { success: true, data: plans }
}

export const createPlan: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const result = await service.addPlan(payload)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const deletePlan: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const result = await service.deletePlan(payload.id)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const fetchTransactions: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new PaymentService(env.DB, meta.tenantId)
    const txs = await service.listTransactions(payload)
    return { success: true, data: txs }
}
