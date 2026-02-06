/**
 * ATOM: tg-get-me
 * Responsabilidade: Valida token Telegram e retorna informações do bot
 * SRP: Apenas faz a chamada getMe() e retorna dados normalizados
 */

import { Bot } from 'grammy'
import type { BotInfo } from '../../../core/types'

export interface TgGetMeProps {
    token: string
}

export interface TgGetMeResult {
    success: boolean
    botInfo?: BotInfo
    error?: string
}

export async function tgGetMe({ token }: TgGetMeProps): Promise<TgGetMeResult> {
    try {
        const bot = new Bot(token)
        const me = await bot.api.getMe()

        return {
            success: true,
            botInfo: {
                id: me.id,
                username: me.username,
                name: me.first_name,
                isValid: true,
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Token inválido',
        }
    }
}
