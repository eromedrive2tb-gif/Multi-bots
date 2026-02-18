import { IMessageSender, RemarketingJob, RateLimitError, BlockError, InvalidRequestError } from '../../domain/types';
import { TelegramSender } from './TelegramSender';
import { DiscordSender } from './DiscordSender';

export class CampaignExecutor implements IMessageSender {
    readonly channel = 'campaign';

    constructor(
        private db: D1Database,
        private onUpdate?: (data: any) => void
    ) { }

    async send(job: RemarketingJob): Promise<void> {
        console.log(`[CampaignExecutor] Sending job ${job.id} for campaign ${job.payload.campaignId || job.campaignId}`);
        const campaignId = job.payload.campaignId || job.campaignId;
        if (!campaignId) {
            console.error('Job missing campaignId', job);
            return;
        }

        // FETCH BATCH (e.g., 5 users)
        const batchSize = 5;
        // Join with customers table to get the actual external_id (Telegram/Discord ID)
        const { results: recipients } = await this.db.prepare(
            `SELECT r.*, c.external_id, c.provider 
             FROM remarketing_recipients r
             LEFT JOIN customers c ON r.customer_id = c.id
             WHERE r.campaign_id = ? AND r.status = 'pending' 
             LIMIT ?`
        ).bind(campaignId, batchSize).all<{
            id: string, customer_id: string, campaign_id: string, status: string, external_id: string
        }>();

        if (!recipients || recipients.length === 0) {
            return; // Finished
        }

        // Fetch Campaign & Bot details ONCE per batch (optimization)
        const campaign = await this.db.prepare('SELECT * FROM remarketing_campaigns WHERE id = ?').bind(campaignId).first<any>();
        if (!campaign) {
            console.error(`Campaign ${campaignId} not found`);
            return;
        }

        const bot = await this.db.prepare('SELECT * FROM bots WHERE id = ?').bind(campaign.bot_id).first<any>();
        if (!bot) {
            console.error(`Bot ${campaign.bot_id} not found`);
            return;
        }

        // Parse content if it's stored as JSON string
        let content = campaign.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { }
        }

        // Parse bot credentials
        let credentials = bot.credentials;
        if (typeof credentials === 'string') {
            try { credentials = JSON.parse(credentials); } catch (e) { }
        }
        const botToken = credentials?.token;

        if (!botToken) {
            console.error(`Bot ${bot.id} has no token`);
            return;
        }

        const telegramSender = new TelegramSender();
        const discordSender = new DiscordSender();

        for (const recipient of recipients) {
            // Jitter: 2-5 seconds delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));

            try {
                // Here we would ideally fetch the customer's preferred channel and contact details.
                // For this implementation, we'll assume we need to use a sender.
                // We'll default to Telegram for now or assume job payload has some generic "message"
                // In a real scenario, we'd join with the customers table.

                // Mock sending based on what we have. 
                // We'll use the job payload message but send to customer_id as chatId (if telegram)

                // MOCK FOR DEMO RECIPIENTS: If ID starts with '5523678', simulate success
                if (recipient.customer_id.startsWith('5523678')) {
                    console.log(`[Mock Send] Simulating success for dummy user ${recipient.customer_id}`);
                    // simulate network delay
                    await new Promise(r => setTimeout(r, 500));
                } else {
                    // Using TelegramSender as default for demo if not specified
                    // Real implementation would deterine channel from customer preferences

                    // Construct the message text. If content is object {text: "..."} use it.
                    const messageText = content.text || (typeof content === 'string' ? content : JSON.stringify(content));

                    const chatId = recipient.external_id;
                    if (!chatId) {
                        console.error(`[CampaignExecutor] No external_id found for customer ${recipient.customer_id}. Marking as failed.`);
                        await this.db.prepare(
                            `UPDATE remarketing_recipients SET status = 'failed', error_code = 404, updated_at = ? WHERE id = ?`
                        ).bind(Date.now(), recipient.id).run();
                        continue;
                    }

                    await telegramSender.send({
                        ...job,
                        payload: {
                            message: messageText,
                            botToken: botToken,
                            chatId: chatId
                        }
                    });
                }

                // Update status to SENT
                await this.db.prepare(
                    `UPDATE remarketing_recipients SET status = 'sent', updated_at = ? WHERE id = ?`
                ).bind(Date.now(), recipient.id).run();

                // Increment SENT stat in campaign
                await this.db.prepare(
                    `UPDATE remarketing_campaigns SET total_sent = total_sent + 1, updated_at = ? WHERE id = ?`
                ).bind(Date.now(), campaignId).run();

            } catch (error: any) {
                if (error.name === 'BlockError' || error.name === 'InvalidRequestError') {
                    console.warn(`[CampaignExecutor] Expected failure for recipient ${recipient.id}: ${error.message}`);
                } else {
                    console.error(`[CampaignExecutor] Unexpected error for recipient ${recipient.id}:`, error);
                }

                let status = 'failed';
                let errorCode = null;

                if (error instanceof RateLimitError) {
                    console.warn(`Rate Limit hit. Pausing campaign ${campaignId} for ${error.retryAfter}ms`);
                    throw error; // Re-throw to be caught by SchedulerDO for rescheduling
                } else if (error instanceof BlockError) {
                    status = 'blocked';
                } else if (error instanceof InvalidRequestError) {
                    // Distinction: invalid ID vs general failure
                    status = 'invalid_id';
                }

                await this.db.prepare(
                    `UPDATE remarketing_recipients SET status = ?, error_code = ?, updated_at = ? WHERE id = ?`
                ).bind(status, errorCode, Date.now(), recipient.id).run();

                // Increment FAILED stat in campaign
                await this.db.prepare(
                    `UPDATE remarketing_campaigns SET total_failed = total_failed + 1, updated_at = ? WHERE id = ?`
                ).bind(Date.now(), campaignId).run();

            }

            // Fetch latest stats for the WHOLE campaign to send a single accurate update
            const stats = await this.db.prepare(
                `SELECT total_sent, total_failed, status FROM remarketing_campaigns WHERE id = ?`
            ).bind(campaignId).first<any>();

            // Trigger ONE real-time update per batch with full stats and processed IDs
            this.onUpdate?.({
                type: 'campaign_update',
                campaignId,
                tenantId: job.tenantId,
                status: stats.status,
                totalSent: stats.total_sent,
                totalFailed: stats.total_failed,
                batch: recipients.map((r: any) => ({ id: r.id, status: r.status })) // Zero-Fetch ID updates
            });
        }

        // Check if more recipients exist

        // Check if more recipients exist
        const remaining = await this.db.prepare(
            `SELECT count(*) as count FROM remarketing_recipients WHERE campaign_id = ? AND status = 'pending'`
        ).bind(campaignId).first<number>('count');

        if (remaining && remaining > 0) {
            // Throw RateLimitError to force reschedule in 10s (batch delay)
            throw new RateLimitError(10000);
        } else {
            // CAMPAIGN COMPLETED
            console.log(`[CampaignExecutor] Campaign ${campaignId} fully processed. Marking as completed.`);
            await this.db.prepare(
                `UPDATE remarketing_campaigns SET status = 'completed', updated_at = ? WHERE id = ?`
            ).bind(Date.now(), campaignId).run();

            // Trigger real-time update for COMPLETION
            this.onUpdate?.({
                type: 'campaign_update',
                campaignId,
                tenantId: job.tenantId,
                status: 'completed'
            });
        }
    }
}
