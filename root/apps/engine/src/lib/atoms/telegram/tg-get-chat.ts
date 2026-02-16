/**
 * ATOM: tg-get-chat
 * Responsabilidade: Retorna informações de um chat do Telegram
 * SRP: Apenas faz a chamada getChat() e retorna dados normalizados
 */

import { Bot } from 'grammy'

export interface TgGetChatProps {
    token: string
    chatId: string | number
}

export interface TgChatInfo {
    id: number
    title?: string
    type: string
    username?: string
    description?: string
    inviteLink?: string
}

export interface TgGetChatResult {
    success: boolean
    chat?: TgChatInfo
    error?: string
}

export async function tgGetChat({ token, chatId }: TgGetChatProps): Promise<TgGetChatResult> {
    try {
        const bot = new Bot(token)
        const chat = await bot.api.getChat(chatId)

        return {
            success: true,
            chat: {
                id: chat.id,
                title: chat.type === 'private' ? (chat.first_name + (chat.last_name ? ' ' + chat.last_name : '')) : chat.title,
                type: chat.type,
                username: chat.username,
                description: 'description' in chat ? chat.description : undefined,
                inviteLink: 'invite_link' in chat ? chat.invite_link : undefined,
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? `Telegram Error: ${error.message}` : 'Erro ao buscar chat',
        }
    }
}
