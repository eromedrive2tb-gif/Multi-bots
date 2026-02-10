/**
 * ORGANISM: NotificationService
 * Responsabilidade: Decide qual provider usar e dispara notificações
 * Orquestra: TelegramProvider e DiscordProvider
 */

import { TelegramProvider } from './TelegramProvider'
import { DiscordProvider } from './DiscordProvider'
import type { Bot, TelegramCredentials, DiscordCredentials } from '../../core/types'

export interface NotificationPayload {
    title?: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error'
}

export class NotificationService {
    /**
     * Envia notificação através do bot apropriado
     */
    async send(
        bot: Bot,
        targetId: string,
        payload: NotificationPayload
    ): Promise<{ success: boolean; error?: string }> {
        const { title, message, type = 'info' } = payload

        if (bot.provider === 'telegram') {
            const provider = new TelegramProvider((bot.credentials as TelegramCredentials).token)

            const emoji = this.getEmoji(type)
            const formattedMessage = title
                ? `${emoji} <b>${title}</b>\n\n${message}`
                : `${emoji} ${message}`

            return provider.sendMessage(targetId, formattedMessage, 'HTML')
        }

        if (bot.provider === 'discord') {
            const provider = new DiscordProvider(bot.credentials as DiscordCredentials)

            const color = this.getDiscordColor(type)

            return provider.sendMessage(targetId, '', {
                title,
                description: message,
                color,
            })
        }

        return { success: false, error: 'Provider não suportado' }
    }

    private getEmoji(type: string): string {
        const emojis: Record<string, string> = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
        }
        return emojis[type] || 'ℹ️'
    }

    private getDiscordColor(type: string): number {
        const colors: Record<string, number> = {
            info: 0x3498db,     // Blue
            success: 0x2ecc71, // Green
            warning: 0xf39c12, // Orange
            error: 0xe74c3c,   // Red
        }
        return colors[type] || 0x3498db
    }
}
