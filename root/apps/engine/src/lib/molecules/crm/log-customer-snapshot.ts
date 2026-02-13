/**
 * MOLECULE: log-customer-snapshot
 * Responsabilidade: Salvar um snapshot dos dados da sessão no histórico
 */

import { dbGetCustomers, dbLogCustomerHistory } from '../../atoms'
import type { UniversalContext, Env } from '../../../core/types'

export async function logCustomerSnapshot(
    ctx: UniversalContext,
    env: Env,
    flowId: string,
    collectedData: any
): Promise<void> {
    try {
        const { tenantId, userId, provider } = ctx

        // 1. Get the customer DB id
        const result = await dbGetCustomers({
            db: ctx.db || env.DB,
            tenantId,
            provider: provider as 'tg' | 'dc',
            search: String(userId), // external_id search
            limit: 1,
            offset: 0
        })

        if (!result.success || result.data.data.length === 0) {
            console.warn('[CRM] Customer not found for snapshot logging')
            return
        }

        const customer = result.data.data[0]

        // 2. Log History
        await dbLogCustomerHistory({
            db: ctx.db || env.DB,
            tenantId,
            customerId: customer.id,
            metadata: collectedData,
            flowId
        })

    } catch (error) {
        console.error('[Molecule] Error in logCustomerSnapshot:', error)
    }
}
