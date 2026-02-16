import { BotError } from '../../../core/types'

interface TelegramChatMember {
    user: {
        id: number
        is_bot: boolean
        first_name: string
        username?: string
    }
    status: 'creator' | 'administrator' | 'member' | 'left' | 'kicked'
    custom_title?: string
}

interface TgGetChatAdministratorsParams {
    token: string
    chatId: string
}

interface TgGetChatAdministratorsResult {
    success: boolean
    administrators?: TelegramChatMember[]
    error?: string
}

export async function tgGetChatAdministrators({ token, chatId }: TgGetChatAdministratorsParams): Promise<TgGetChatAdministratorsResult> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getChatAdministrators`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId })
        })

        const data = await response.json() as any

        if (!data.ok) {
            console.error('[Telegram] Error fetching chat administrators:', data)
            return { success: false, error: data.description || 'Error fetching administrators' }
        }

        return { success: true, administrators: data.result }
    } catch (error) {
        console.error('[Telegram] Network error fetching chat administrators:', error)
        return { success: false, error: 'Network error' }
    }
}
