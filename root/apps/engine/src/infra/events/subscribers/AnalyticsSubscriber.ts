/**
 * SUBSCRIBER: Analytics
 * Reacts to: FLOW_COMPLETED, STEP_ERROR
 * 
 * Extracted from TelegramWebhookHandler.logFlowAnalytics()
 * and DiscordWebhookHandler.logFlowAnalytics()
 */

import type { DomainEvent } from '../../../core/domain-events'
import { DomainEventType } from '../../../core/domain-events'
import type { FlowCompletedPayload, FlowErrorPayload } from '../../../core/domain-events'
import type { Env } from '../../../core/types'
import { dbLogAnalyticsEvent } from '../../../lib/atoms'
import { ErrorSeverity } from '../../../core/analytics-types'

export function registerAnalyticsSubscriber(
    on: (type: DomainEventType, handler: (event: DomainEvent, env: Env) => Promise<void>) => void
): void {
    // FLOW_COMPLETED → log flow_complete event
    on(DomainEventType.FLOW_COMPLETED, async (event, env) => {
        const payload = event.payload as FlowCompletedPayload
        const ctx = payload.ctx

        if (payload.stepsExecuted > 0) {
            await dbLogAnalyticsEvent({
                db: env.DB,
                tenantId: event.tenantId,
                botId: event.botId,
                blueprintId: payload.blueprintId,
                stepId: 'flow_complete',
                userId: ctx.userId,
                eventType: 'flow_complete',
                eventData: {
                    stepsExecuted: payload.stepsExecuted,
                }
            })
        }
    })

    // FLOW_ERROR → log step_error with severity
    on(DomainEventType.FLOW_ERROR, async (event, env) => {
        const payload = event.payload as FlowErrorPayload
        const ctx = payload.ctx

        let severity = ErrorSeverity.CRITICAL
        if (payload.error.includes('Command trigger mismatch')) {
            severity = ErrorSeverity.LOW
        }

        await dbLogAnalyticsEvent({
            db: env.DB,
            tenantId: event.tenantId,
            botId: event.botId,
            blueprintId: payload.blueprintId,
            stepId: payload.lastStepId || 'unknown',
            userId: ctx.userId,
            eventType: 'step_error',
            eventData: {
                error: payload.error,
                stepsExecuted: payload.stepsExecuted,
                severity,
            }
        })
    })

    console.log('[EventBus] AnalyticsSubscriber registered.')
}
