/**
 * ATOM: tg-send-photo
 * Responsabilidade: Enviar uma foto para o Telegram
 * SRP: Apenas envia foto, usando grammy
 */

import { Bot, InputFile, InlineKeyboard } from 'grammy'

export interface TgSendPhotoProps {
    token: string
    chatId: string | number
    photo: string | Uint8Array // URL or Uint8Array
    caption?: string
    buttons?: Array<Array<{ text: string; callback_data: string }>>
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
}

export interface TgSendPhotoResult {
    success: boolean
    messageId?: number
    error?: string
}

export async function tgSendPhoto({
    token,
    chatId,
    photo,
    caption,
    buttons,
    parseMode = 'HTML',
}: TgSendPhotoProps): Promise<TgSendPhotoResult> {
    try {
        const bot = new Bot(token)
        let photoToSend: string | InputFile

        if (typeof photo === 'string') {
            photoToSend = photo
        } else {
            // Se for Buffer ou Uint8Array, usa InputFile
            // InputFile do grammy aceita Buffer, Stream, etc.
            photoToSend = new InputFile(photo)
        }

        let reply_markup: InlineKeyboard | undefined

        if (buttons && buttons.length > 0) {
            reply_markup = new InlineKeyboard()
            buttons.forEach(row => {
                row.forEach(btn => {
                    reply_markup!.text(btn.text, btn.callback_data)
                })
                reply_markup!.row()
            })
        }

        const result = await bot.api.sendPhoto(chatId, photoToSend, {
            caption: caption,
            parse_mode: parseMode,
            reply_markup,
        })

        return {
            success: true,
            messageId: result.message_id,
        }
    } catch (error) {
        console.error('[tg-send-photo] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao enviar foto',
        }
    }
}
