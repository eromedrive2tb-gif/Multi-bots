/**
 * ATOM: db-log-analytics
 * Responsabilidade: Inserir eventos de analytics no banco D1
 * Proibido: Importar outros atoms, molecules ou organisms
 */

import { nanoid } from 'nanoid'
import type { Result } from '../../../core/types'
import type { AnalyticsEventType, LogAnalyticsEventInput } from '../../../core/analytics-types'

interface LogAnalyticsParams {
    db: D1Database
    tenantId: string
    botId: string
    blueprintId: string
    stepId: string
    userId: string
    eventType: AnalyticsEventType
    eventData?: Record<string, unknown>
}

/**
 * Loga um evento de analytics no banco
 */
export async function dbLogAnalyticsEvent(params: LogAnalyticsParams): Promise<Result<{ id: string }>> {
    const { db, tenantId, botId, blueprintId, stepId, userId, eventType, eventData } = params
    const id = nanoid()

    try {
        await db.prepare(`
            INSERT INTO analytics_events (id, tenant_id, bot_id, blueprint_id, step_id, user_id, event_type, event_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            tenantId,
            botId,
            blueprintId,
            stepId,
            userId,
            eventType,
            eventData ? JSON.stringify(eventData) : null
        ).run()

        return { success: true, data: { id } }
    } catch (error) {
        return { success: false, error: `Failed to log analytics event: ${error}` }
    }
}
