/**
 * ORGANISM: WebhookService
 * Responsabilidade: Processamento centralizado de webhooks
 * Orquestra: Database Atoms e Provider Handlers
 */

import { dbGetBotById } from '../atoms/database'
import { handleTelegramWebhook } from './TelegramWebhookHandler'
import type { TelegramUpdate } from '../atoms/telegram'

export class WebhookService {
    constructor(private db: D1Database, private env: any) { }

    /**
     * Processa um webhook do Telegram
     */
    async processTelegramWebhook(botId: string, secretToken: string | undefined, payload: TelegramUpdate): Promise<{ success: boolean; status: number; error?: string }> {
        // 1. Get bot
        const bot = await dbGetBotById({ db: this.db, id: botId })

        if (!bot) {
            return { success: false, status: 404, error: 'Bot not found' }
        }

        // 2. Validate secret
        if (bot.webhookSecret && bot.webhookSecret !== secretToken) {
            return { success: false, status: 401, error: 'Invalid secret' }
        }

        try {
            // 3. Handle Update
            await handleTelegramWebhook(payload, {
                env: this.env,
                botId,
                tenantId: bot.tenantId,
            })

            return { success: true, status: 200 }
        } catch (error) {
            console.error('Webhook processing error:', error)
            // Telegram expects 200 even on error to stop retrying malformed updates
            return { success: true, status: 200 }
        }
    }
}
