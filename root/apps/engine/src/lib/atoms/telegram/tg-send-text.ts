/**
 * ATOM: tg-send-text
 * Responsabilidade: Envia uma mensagem de texto via Telegram
 * SRP: Apenas envia texto, não faz log, não valida
 */

import { Bot } from 'grammy'

export interface TgSendTextProps {
    token: string
    chatId: string | number
    text: string
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
}

export interface TgSendTextResult {
    success: boolean
    messageId?: number
    error?: string
}

export async function tgSendText({
    token,
    chatId,
    text,
    parseMode = 'HTML',
}: TgSendTextProps): Promise<TgSendTextResult> {
    try {
        const bot = new Bot(token)
        const result = await bot.api.sendMessage(chatId, text, {
            parse_mode: parseMode,
        })

        return {
            success: true,
            messageId: result.message_id,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        }
    }
}
