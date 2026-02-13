/**
 * ATOM: db-save-broadcast
 * Salva uma postagem/broadcast no banco
 */

import type { Broadcast, BroadcastContent, BroadcastStatus, TargetType } from '../../../core/broadcast-types'

export interface DbSaveBroadcastProps {
    db: D1Database
    id: string
    tenantId: string
    botId: string
    title: string
    content: BroadcastContent
    targetType: TargetType
    targetId?: string
    status?: BroadcastStatus
    scheduledAt?: string
}

export async function dbSaveBroadcast(props: DbSaveBroadcastProps): Promise<Broadcast> {
    const now = new Date().toISOString()
    const status = props.status || (props.scheduledAt ? 'scheduled' : 'draft')

    await props.db.prepare(`
        INSERT INTO broadcasts (id, tenant_id, bot_id, title, content, target_type, target_id, status, scheduled_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        props.id, props.tenantId, props.botId, props.title,
        JSON.stringify(props.content), props.targetType,
        props.targetId || null, status, props.scheduledAt || null, now, now
    ).run()

    return {
        id: props.id, tenantId: props.tenantId, botId: props.botId,
        title: props.title, content: props.content, targetType: props.targetType,
        targetId: props.targetId || null, status,
        scheduledAt: props.scheduledAt || null, sentAt: null,
        totalRecipients: 0, deliveredCount: 0, failedCount: 0,
        createdAt: now, updatedAt: now,
    }
}
