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
    callback_query?: {
        id: string
        from: {
            id: number
            first_name: string
            username?: string
        }
        message?: {
            message_id: number
            chat: {
                id: number
                type: string
            }
            date: number
        }
        data?: string
    }
    my_chat_member?: {
        chat: {
            id: number
            title: string
            type: string
        }
        from: {
            id: number
            first_name: string
            username?: string
        }
        date: number
        old_chat_member: {
            status: string
        }
        new_chat_member: {
            status: string
            user: {
                id: number
                is_bot: boolean
                username?: string
            }
        }
    }
    chat_member?: {
        chat: {
            id: number
            title: string
            type: string
        }
        from: {
            id: number
            first_name: string
            username?: string
        }
        date: number
        old_chat_member: {
            status: string
        }
        new_chat_member: {
            status: string
            user: {
                id: number
                is_bot: boolean
                username?: string
                first_name: string
            }
        }
    }
}

export interface TgHandleUpdateResult {
    isCommand: boolean
    command?: string
    args?: string
    message?: GenericMessage
    callbackQueryId?: string
}

export function tgHandleUpdate(update: TelegramUpdate): TgHandleUpdateResult {
    // Handle Callback Query (Inline Buttons)
    if (update.callback_query && update.callback_query.data) {
        const cb = update.callback_query
        const messageId = cb.message?.message_id ?? 0
        const chatId = cb.message?.chat.id ?? 0

        return {
            isCommand: false,
            callbackQueryId: cb.id,
            message: {
                id: String(messageId),
                chatId: String(chatId),
                text: cb.data ?? '', // Treat callback data as text input
                from: {
                    id: String(cb.from.id),
                    name: cb.from.first_name,
                    username: cb.from.username,
                },
                timestamp: new Date(),
                provider: 'telegram' as BotProvider,
                raw: update,
            }
        }
    }

    // Handle Text Message
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
