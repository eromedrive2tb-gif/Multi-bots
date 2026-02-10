/**
 * ATOM: tg-set-webhook
 * Responsabilidade: Configura o webhook do bot Telegram
 * SRP: Apenas configura webhook, não valida, não salva
 */

import { Bot } from 'grammy'

export interface TgSetWebhookProps {
    token: string
    url: string
    secretToken?: string
}

export interface TgSetWebhookResult {
    success: boolean
    error?: string
}

export async function tgSetWebhook({
    token,
    url,
    secretToken,
}: TgSetWebhookProps): Promise<TgSetWebhookResult> {
    try {
        const bot = new Bot(token)
        await bot.api.setWebhook(url, {
            secret_token: secretToken,
            drop_pending_updates: true,
        })

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao configurar webhook',
        }
    }
}

export async function tgDeleteWebhook({ token }: { token: string }): Promise<TgSetWebhookResult> {
    try {
        const bot = new Bot(token)
        await bot.api.deleteWebhook({ drop_pending_updates: true })

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao remover webhook',
        }
    }
}
