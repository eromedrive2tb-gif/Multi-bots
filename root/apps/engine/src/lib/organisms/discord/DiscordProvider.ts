/**
 * ORGANISM: DiscordProvider
 * Responsabilidade: Orquestra todas as operações Discord
 * Encapsula: Todos os atoms do Discord
 */

import { dcValidateToken, dcSendMessage } from '../../atoms'
import type { BotInfo, DiscordCredentials } from '../../../core/types'

export class DiscordProvider {
    constructor(private credentials: DiscordCredentials) { }

    /**
     * Valida as credenciais e retorna informações da app
     */
    async validate(): Promise<{ success: boolean; botInfo?: BotInfo; error?: string }> {
        return dcValidateToken(this.credentials)
    }

    /**
     * Envia mensagem em um canal
     */
    async sendMessage(
        channelId: string,
        content: string,
        embed?: { title?: string; description?: string; color?: number }
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        return dcSendMessage({
            token: this.credentials.token,
            channelId,
            content,
            embed,
        })
    }
}
