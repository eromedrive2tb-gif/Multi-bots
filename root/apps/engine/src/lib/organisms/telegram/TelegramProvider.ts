/**
 * ORGANISM: TelegramProvider
 * Responsabilidade: Orquestra todas as operações Telegram
 * Encapsula: Todos os atoms do Telegram
 */

import { tgGetMe, tgSendText, tgSetWebhook, tgDeleteWebhook } from '../../atoms'
import type { BotInfo } from '../../../core/types'

export class TelegramProvider {
    constructor(private token: string) { }

    /**
     * Valida o token e retorna informações do bot
     */
    async validate(): Promise<{ success: boolean; botInfo?: BotInfo; error?: string }> {
        return tgGetMe({ token: this.token })
    }

    /**
     * Envia mensagem de texto
     */
    async sendMessage(
        chatId: string | number,
        text: string,
        parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
    ): Promise<{ success: boolean; messageId?: number; error?: string }> {
        return tgSendText({
            token: this.token,
            chatId,
            text,
            parseMode,
        })
    }

    /**
     * Configura webhook
     */
    async setupWebhook(
        url: string,
        secretToken?: string
    ): Promise<{ success: boolean; error?: string }> {
        return tgSetWebhook({
            token: this.token,
            url,
            secretToken,
        })
    }

    /**
     * Remove webhook
     */
    async removeWebhook(): Promise<{ success: boolean; error?: string }> {
        return tgDeleteWebhook({ token: this.token })
    }
}
