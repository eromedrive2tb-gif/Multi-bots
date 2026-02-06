/**
 * ATOM: tg-handle-update
 * Responsabilidade: Processa updates do Telegram (webhook)
 * SRP: Apenas processa o update, não responde automaticamente
 */

import type { GenericMessage, BotProvider } from '../../../core/types'

export interface TelegramUpdate {
    update_id: number
    message?: {
        message_id: number
        from: {
            id: number
            first_name: string
            username?: string
        }
        chat: {
            id: number
            type: string
        }
        date: number
        text?: string
    }
}

export interface TgHandleUpdateResult {
    isCommand: boolean
    command?: string
    args?: string
    message?: GenericMessage
}

export function tgHandleUpdate(update: TelegramUpdate): TgHandleUpdateResult {
    if (!update.message || !update.message.text) {
        return { isCommand: false }
    }

    const text = update.message.text
    const msg = update.message

    // Parse message to GenericMessage
    const genericMessage: GenericMessage = {
        id: String(msg.message_id),
        chatId: String(msg.chat.id),
        text: text,
        from: {
            id: String(msg.from.id),
            name: msg.from.first_name,
            username: msg.from.username,
        },
        timestamp: new Date(msg.date * 1000),
        provider: 'telegram' as BotProvider,
        raw: update,
    }

    // Check if it's a command
    if (text.startsWith('/')) {
        const parts = text.slice(1).split(' ')
        const command = parts[0].toLowerCase().split('@')[0] // Remove @botname
        const args = parts.slice(1).join(' ')

        return {
            isCommand: true,
            command,
            args,
            message: genericMessage,
        }
    }

    return {
        isCommand: false,
        message: genericMessage,
    }
}
