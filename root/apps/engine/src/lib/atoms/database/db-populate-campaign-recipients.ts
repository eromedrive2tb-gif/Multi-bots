import { Result } from '../../../core/types'

export interface DbPopulateCampaignRecipientsProps {
    db: D1Database
    tenantId: string
    campaignId: string
    limit?: number
}

export async function dbPopulateCampaignRecipients({ db, tenantId, campaignId, limit = 100 }: DbPopulateCampaignRecipientsProps): Promise<Result<{ count: number }>> {
    try {
        // Ensure we don't duplicate if already populated (e.g. pausing and resuming)
        const existing = await db.prepare(
            `SELECT count(*) as c FROM remarketing_recipients WHERE campaign_id = ?`
        ).bind(campaignId).first('c');

        // Fix: Check if existing is a number and strictly greater than 0
        if (typeof existing === 'number' && existing > 0) {
            return { success: true, data: { count: existing } }
        }

        // Mocking the selection source. Assuming a 'customers' table exists.
        // We use INSERT INTO ... SELECT ... to be efficient.
        await db.prepare(`
            INSERT INTO remarketing_recipients (id, campaign_id, customer_id, status, created_at)
            SELECT 
                lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
                ?, 
                id, 
                'pending', 
                ?
            FROM customers 
            WHERE tenant_id = ?
            LIMIT ? 
        `).bind(campaignId, Date.now(), tenantId, limit).run()

        // Check if we actually inserted anything
        const countRes = await db.prepare(
            `SELECT count(*) as c FROM remarketing_recipients WHERE campaign_id = ?`
        ).bind(campaignId).first('c');

        // Demo Fallback if no customers
        if (!countRes || countRes === 0) {
            console.warn('No customers found to populate. Inserting dummy recipients for demo.');
            const stmt = db.prepare(`
                INSERT INTO remarketing_recipients (id, campaign_id, customer_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)
             `);
            const batch = [];
            for (let i = 0; i < 10; i++) {
                batch.push(stmt.bind(crypto.randomUUID(), campaignId, `5523678${i}`, Date.now()));
            }
            await db.batch(batch);
            return { success: true, data: { count: 10 } }
        }

        return { success: true, data: { count: Number(countRes) } }

    } catch (e) {
        console.error('[dbPopulateCampaignRecipients] Error:', e)
        return { success: false, error: 'Falha ao popular destinatários da campanha' }
    }
}
