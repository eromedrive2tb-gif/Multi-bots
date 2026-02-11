/**
 * ORGANISM: WebhookService
 * Responsabilidade: Processamento centralizado de webhooks
 * Orquestra: Database Atoms e Provider Handlers
 */

import { dbGetBotById } from '../../atoms'
import { handleTelegramWebhook, handleDiscordWebhook } from '../'
import { dcVerifySignature, type DiscordInteraction } from '../../atoms'
import type { TelegramUpdate } from '../../atoms'
import type { DiscordCredentials } from '../../../core/types'

export class WebhookService {
    constructor(private db: D1Database, private env: any) { }

    /**
     * Processa um webhook do Telegram
     */
    async processTelegramWebhook(botId: string, secretToken: string | undefined, payload: TelegramUpdate): Promise<{ success: boolean; status: number; error?: string }> {
        const bot = await dbGetBotById({ db: this.db, id: botId })

        if (!bot) {
            return { success: false, status: 404, error: 'Bot not found' }
        }

        if (bot.webhookSecret && bot.webhookSecret !== secretToken) {
            return { success: false, status: 401, error: 'Invalid secret' }
        }

        try {
            await handleTelegramWebhook(payload, {
                env: this.env,
                botId,
                tenantId: bot.tenantId,
            })

            return { success: true, status: 200 }
        } catch (error) {
            console.error('Telegram Webhook error:', error)
            return { success: true, status: 200 }
        }
    }

    /**
     * Processa um webhook do Discord
     */
    async processDiscordWebhook(
        botId: string,
        signature: string | undefined,
        timestamp: string | undefined,
        rawBody: string,
        payload: DiscordInteraction
    ): Promise<{ success: boolean; status: number; response?: any; executionPromise?: Promise<any>; error?: string }> {
        const bot = await dbGetBotById({ db: this.db, id: botId })

        if (!bot) {
            return { success: false, status: 404, error: 'Bot not found' }
        }

        const credentials = bot.credentials as DiscordCredentials

        // 1. Verificação de assinatura (Obrigatório para Discord)
        if (!signature || !timestamp) {
            return { success: false, status: 401, error: 'Missing signature headers' }
        }

        const isValid = await dcVerifySignature({
            publicKey: credentials.publicKey,
            signature,
            timestamp,
            body: rawBody,
        })

        if (!isValid) {
            return { success: false, status: 401, error: 'Invalid signature' }
        }

        try {
            // 2. Handle Interaction
            const result = await handleDiscordWebhook(payload, {
                env: this.env,
                botId,
                tenantId: bot.tenantId,
            })

            return {
                success: result.handled,
                status: 200,
                response: result.response,
                executionPromise: result.executionPromise,
                error: result.error
            }
        } catch (error) {
            console.error('Discord Webhook error:', error)
            return { success: false, status: 500, error: 'Internal error' }
        }
    }
}
