import { Result } from '../../../core/types'

export interface DbGetCampaignRecipientsProps {
    db: D1Database
    campaignId: string
    limit?: number
}

export async function dbGetCampaignRecipients({ db, campaignId, limit = 100 }: DbGetCampaignRecipientsProps): Promise<Result<any[]>> {
    try {
        const { results } = await db.prepare(
            `SELECT * FROM remarketing_recipients WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?`
        ).bind(campaignId, limit).all()
        return { success: true, data: results || [] }
    } catch (error) {
        console.error('[dbGetCampaignRecipients] Error:', error)
        return { success: false, error: 'Erro ao buscar destinatários' }
    }
}
