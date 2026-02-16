import { BotError } from '../../../core/types'

interface TgGetChatMemberCountParams {
    token: string
    chatId: string
}

interface TgGetChatMemberCountResult {
    success: boolean
    count?: number
    error?: string
}

export async function tgGetChatMemberCount({ token, chatId }: TgGetChatMemberCountParams): Promise<TgGetChatMemberCountResult> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getChatMemberCount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId })
        })

        const data = await response.json() as any

        if (!data.ok) {
            console.error('[Telegram] Error fetching chat member count:', data)
            return { success: false, error: data.description || 'Error fetching member count' }
        }

        return { success: true, count: data.result }
    } catch (error) {
        console.error('[Telegram] Network error fetching chat member count:', error)
        return { success: false, error: 'Network error' }
    }
}
