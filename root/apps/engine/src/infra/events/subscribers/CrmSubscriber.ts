/**
 * SUBSCRIBER: CRM
 * Reacts to: USER_INTERACTED, FLOW_COMPLETED
 * 
 * Extracted from TelegramWebhookHandler (upsertCustomer, logCustomerSnapshot)
 * and DiscordWebhookHandler (same logic)
 */

import type { DomainEvent } from '../../../core/domain-events'
import { DomainEventType } from '../../../core/domain-events'
import type { UserInteractedPayload, FlowCompletedPayload } from '../../../core/domain-events'
import type { Env } from '../../../core/types'
import { upsertCustomer, logCustomerSnapshot, getOrCreateSessionAt } from '../../../lib/molecules'

export function registerCrmSubscriber(
    on: (type: DomainEventType, handler: (event: DomainEvent, env: Env) => Promise<void>) => void
): void {
    // USER_INTERACTED → upsert customer in CRM
    on(DomainEventType.USER_INTERACTED, async (event, env) => {
        const payload = event.payload as UserInteractedPayload
        await upsertCustomer(payload.ctx, env)
    })

    // FLOW_COMPLETED → log customer history snapshot
    on(DomainEventType.FLOW_COMPLETED, async (event, env) => {
        const payload = event.payload as FlowCompletedPayload
        const ctx = payload.ctx

        // Only snapshot if flow truly completed (no lastStepId means reached end)
        if (payload.collectedData) {
            await logCustomerSnapshot(
                ctx,
                env,
                payload.blueprintId,
                payload.collectedData
            )
        } else {
            // Try to fetch session data if not provided
            const sessionRes = await getOrCreateSessionAt(
                env.SESSIONS_KV,
                ctx.tenantId,
                ctx.provider,
                String(ctx.userId)
            )
            if (sessionRes.success) {
                await logCustomerSnapshot(
                    ctx,
                    env,
                    payload.blueprintId,
                    sessionRes.data.collectedData
                )
            }
        }
    })

    console.log('[EventBus] CrmSubscriber registered.')
}
