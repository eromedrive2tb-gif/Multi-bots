/**
 * ATOMS: db-redirects
 * CRUD for redirect links and click tracking
 */

import type { Redirect, RedirectClick, RedirectStats } from '../../../core/redirect-types'

export async function dbSaveRedirect(props: {
    db: D1Database; id: string; tenantId: string; slug: string; destinationUrl: string;
    destinationType?: 'url' | 'bot'; botId?: string; flowId?: string;
    domain?: string; cloakerEnabled?: boolean; cloakerMethod?: 'redirect' | 'safe_page' | 'mirror';
    cloakerSafeUrl?: string; pixelId?: string;
    utmSource?: string; utmMedium?: string; utmCampaign?: string;
}): Promise<Redirect> {
    const now = new Date().toISOString()
    await props.db.prepare(`
        INSERT INTO redirects (
            id, tenant_id, slug, destination_url, destination_type, bot_id, flow_id,
            domain, cloaker_enabled, cloaker_method, cloaker_safe_url, pixel_id,
            utm_source, utm_medium, utm_campaign, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        props.id, props.tenantId, props.slug, props.destinationUrl,
        props.destinationType || 'url', props.botId || null, props.flowId || null,
        props.domain || 'multibots.app', props.cloakerEnabled ? 1 : 0,
        props.cloakerMethod || 'redirect', props.cloakerSafeUrl || null, props.pixelId || null,
        props.utmSource || null, props.utmMedium || null, props.utmCampaign || null,
        now, now
    ).run()

    return {
        id: props.id, tenantId: props.tenantId, slug: props.slug,
        destinationUrl: props.destinationUrl, destinationType: props.destinationType || 'url',
        botId: props.botId, flowId: props.flowId,
        domain: props.domain || 'multibots.app',
        cloakerEnabled: props.cloakerEnabled || false,
        cloakerMethod: props.cloakerMethod || 'redirect',
        cloakerSafeUrl: props.cloakerSafeUrl || null, pixelId: props.pixelId,
        utmSource: props.utmSource || null, utmMedium: props.utmMedium || null,
        utmCampaign: props.utmCampaign || null,
        totalClicks: 0, isActive: true, createdAt: now, updatedAt: now,
    }
}

export async function dbGetRedirects(props: {
    db: D1Database; tenantId: string; limit?: number; offset?: number;
}): Promise<Redirect[]> {
    const result = await props.db.prepare(
        `SELECT * FROM redirects WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(props.tenantId, props.limit || 50, props.offset || 0).all()

    return (result.results || []).map((r: any) => ({
        id: r.id, tenantId: r.tenant_id, slug: r.slug, destinationUrl: r.destination_url,
        destinationType: r.destination_type, botId: r.bot_id, flowId: r.flow_id,
        domain: r.domain, cloakerEnabled: Boolean(r.cloaker_enabled),
        cloakerMethod: r.cloaker_method, cloakerSafeUrl: r.cloaker_safe_url, pixelId: r.pixel_id,
        utmSource: r.utm_source, utmMedium: r.utm_medium, utmCampaign: r.utm_campaign,
        totalClicks: r.total_clicks, isActive: Boolean(r.is_active),
        createdAt: r.created_at, updatedAt: r.updated_at,
    }))
}

export async function dbGetRedirectBySlug(db: D1Database, slug: string): Promise<Redirect | null> {
    const row = await db.prepare(`SELECT * FROM redirects WHERE slug = ? AND is_active = 1`).bind(slug).first<any>()
    if (!row) return null
    return {
        id: row.id, tenantId: row.tenant_id, slug: row.slug, destinationUrl: row.destination_url,
        destinationType: row.destination_type, botId: row.bot_id, flowId: row.flow_id,
        domain: row.domain, cloakerEnabled: Boolean(row.cloaker_enabled),
        cloakerMethod: row.cloaker_method, cloakerSafeUrl: row.cloaker_safe_url, pixelId: row.pixel_id,
        utmSource: row.utm_source, utmMedium: row.utm_medium, utmCampaign: row.utm_campaign,
        totalClicks: row.total_clicks, isActive: true,
        createdAt: row.created_at, updatedAt: row.updated_at,
    }
}

export async function dbDeleteRedirect(db: D1Database, redirectId: string, tenantId: string): Promise<boolean> {
    const result = await db.prepare(`DELETE FROM redirects WHERE id = ? AND tenant_id = ?`).bind(redirectId, tenantId).run()
    return (result.meta?.changes ?? 0) > 0
}

export async function dbTrackClick(props: {
    db: D1Database; redirectId: string; ipAddress?: string; userAgent?: string;
    deviceType?: string; referer?: string; country?: string;
}): Promise<void> {
    const id = crypto.randomUUID()
    await props.db.batch([
        props.db.prepare(`INSERT INTO redirect_clicks (id, redirect_id, ip_address, user_agent, device_type, referer, country) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .bind(id, props.redirectId, props.ipAddress || null, props.userAgent || null, props.deviceType || null, props.referer || null, props.country || null),
        props.db.prepare(`UPDATE redirects SET total_clicks = total_clicks + 1, updated_at = ? WHERE id = ?`)
            .bind(new Date().toISOString(), props.redirectId),
    ])
}

export async function dbGetRedirectStats(db: D1Database, tenantId: string): Promise<RedirectStats> {
    const result = await db.prepare(`
        SELECT
            COUNT(*) as total_links,
            SUM(total_clicks) as total_clicks,
            SUM(CASE WHEN cloaker_enabled = 1 THEN 1 ELSE 0 END) as with_cloaker,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_links
        FROM redirects WHERE tenant_id = ?
    `).bind(tenantId).first<any>()

    return {
        totalLinks: result?.total_links || 0,
        totalClicks: result?.total_clicks || 0,
        withCloaker: result?.with_cloaker || 0,
        activeLinks: result?.active_links || 0,
    }
}
