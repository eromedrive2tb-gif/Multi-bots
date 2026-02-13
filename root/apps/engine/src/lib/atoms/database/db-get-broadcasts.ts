/**
 * ATOM: db-get-broadcasts
 * Lista broadcasts de um tenant
 */

import type { Broadcast, BroadcastContent, BroadcastStatus, TargetType } from '../../../core/broadcast-types'

export interface DbGetBroadcastsProps {
    db: D1Database
    tenantId: string
    status?: BroadcastStatus
    botId?: string
    limit?: number
    offset?: number
}

export async function dbGetBroadcasts(props: DbGetBroadcastsProps): Promise<Broadcast[]> {
    let query = `SELECT * FROM broadcasts WHERE tenant_id = ?`
    const bindings: any[] = [props.tenantId]

    if (props.status) { query += ` AND status = ?`; bindings.push(props.status) }
    if (props.botId) { query += ` AND bot_id = ?`; bindings.push(props.botId) }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    bindings.push(props.limit || 50, props.offset || 0)

    const result = await props.db.prepare(query).bind(...bindings).all()

    return (result.results || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        botId: row.bot_id,
        title: row.title,
        content: JSON.parse(row.content || '{}') as BroadcastContent,
        targetType: row.target_type as TargetType,
        targetId: row.target_id,
        status: row.status as BroadcastStatus,
        scheduledAt: row.scheduled_at,
        sentAt: row.sent_at,
        totalRecipients: row.total_recipients,
        deliveredCount: row.delivered_count,
        failedCount: row.failed_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }))
}

export async function dbUpdateBroadcastStatus(
    db: D1Database, broadcastId: string, status: BroadcastStatus,
    updates?: { sentAt?: string; deliveredCount?: number; failedCount?: number; totalRecipients?: number }
): Promise<boolean> {
    const now = new Date().toISOString()
    let query = `UPDATE broadcasts SET status = ?, updated_at = ?`
    const bindings: any[] = [status, now]

    if (updates?.sentAt) { query += `, sent_at = ?`; bindings.push(updates.sentAt) }
    if (updates?.deliveredCount !== undefined) { query += `, delivered_count = ?`; bindings.push(updates.deliveredCount) }
    if (updates?.failedCount !== undefined) { query += `, failed_count = ?`; bindings.push(updates.failedCount) }
    if (updates?.totalRecipients !== undefined) { query += `, total_recipients = ?`; bindings.push(updates.totalRecipients) }

    query += ` WHERE id = ?`
    bindings.push(broadcastId)

    const result = await db.prepare(query).bind(...bindings).run()
    return (result.meta?.changes ?? 0) > 0
}

export async function dbDeleteBroadcast(db: D1Database, broadcastId: string, tenantId: string): Promise<boolean> {
    const result = await db.prepare(`DELETE FROM broadcasts WHERE id = ? AND tenant_id = ?`).bind(broadcastId, tenantId).run()
    return (result.meta?.changes ?? 0) > 0
}
