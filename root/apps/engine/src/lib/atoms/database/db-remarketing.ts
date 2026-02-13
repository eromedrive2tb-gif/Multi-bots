/**
 * ATOMS: db-save/get/update remarketing campaigns
 */

import type { RemarketingCampaign, BroadcastContent, Segment, RemarketingStatus } from '../../../core/broadcast-types'

export async function dbSaveCampaign(props: {
    db: D1Database; id: string; tenantId: string; name: string; segment: Segment;
    botId: string; content: BroadcastContent; filters?: Record<string, unknown>;
}): Promise<RemarketingCampaign> {
    const now = new Date().toISOString()
    await props.db.prepare(`
        INSERT INTO remarketing_campaigns (id, tenant_id, name, segment, bot_id, content, status, filters, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).bind(
        props.id, props.tenantId, props.name, props.segment, props.botId,
        JSON.stringify(props.content), JSON.stringify(props.filters || {}), now, now
    ).run()

    return {
        id: props.id, tenantId: props.tenantId, name: props.name, segment: props.segment,
        botId: props.botId, content: props.content, status: 'draft',
        filters: props.filters || {}, totalTargeted: 0, totalSent: 0, totalFailed: 0,
        createdAt: now, updatedAt: now,
    }
}

export async function dbGetCampaigns(props: {
    db: D1Database; tenantId: string; status?: RemarketingStatus; limit?: number; offset?: number;
}): Promise<RemarketingCampaign[]> {
    let query = `SELECT * FROM remarketing_campaigns WHERE tenant_id = ?`
    const bindings: any[] = [props.tenantId]
    if (props.status) { query += ` AND status = ?`; bindings.push(props.status) }
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    bindings.push(props.limit || 50, props.offset || 0)

    const result = await props.db.prepare(query).bind(...bindings).all()
    return (result.results || []).map((row: any) => ({
        id: row.id, tenantId: row.tenant_id, name: row.name,
        segment: row.segment as Segment, botId: row.bot_id,
        content: JSON.parse(row.content || '{}') as BroadcastContent,
        status: row.status as RemarketingStatus,
        filters: JSON.parse(row.filters || '{}'),
        totalTargeted: row.total_targeted, totalSent: row.total_sent, totalFailed: row.total_failed,
        createdAt: row.created_at, updatedAt: row.updated_at,
    }))
}

export async function dbUpdateCampaignStatus(
    db: D1Database, campaignId: string, status: RemarketingStatus,
    updates?: { totalTargeted?: number; totalSent?: number; totalFailed?: number }
): Promise<boolean> {
    const now = new Date().toISOString()
    let query = `UPDATE remarketing_campaigns SET status = ?, updated_at = ?`
    const bindings: any[] = [status, now]
    if (updates?.totalTargeted !== undefined) { query += `, total_targeted = ?`; bindings.push(updates.totalTargeted) }
    if (updates?.totalSent !== undefined) { query += `, total_sent = ?`; bindings.push(updates.totalSent) }
    if (updates?.totalFailed !== undefined) { query += `, total_failed = ?`; bindings.push(updates.totalFailed) }
    query += ` WHERE id = ?`; bindings.push(campaignId)
    const result = await db.prepare(query).bind(...bindings).run()
    return (result.meta?.changes ?? 0) > 0
}

export async function dbDeleteCampaign(db: D1Database, campaignId: string, tenantId: string): Promise<boolean> {
    const result = await db.prepare(`DELETE FROM remarketing_campaigns WHERE id = ? AND tenant_id = ?`).bind(campaignId, tenantId).run()
    return (result.meta?.changes ?? 0) > 0
}
