/**
 * MOLECULE: health-check-bot
 * Responsabilidade: Verifica se o bot está online e atualiza status
 * Compõe: tg-get-me ou dc-validate-token + db-update-bot-status
 */

import { tgGetMe } from '../../atoms'
import { dcValidateToken } from '../../atoms'
import { dbUpdateBotStatus } from '../../atoms'
import type { Bot, TelegramCredentials, DiscordCredentials, BotStatus } from '../../../core/types'

export interface HealthCheckBotProps {
    db: D1Database
    bot: Bot
}

export interface HealthCheckBotResult {
    success: boolean
    status: BotStatus
    message?: string
}

export async function healthCheckBot({
    db,
    bot,
}: HealthCheckBotProps): Promise<HealthCheckBotResult> {
    let status: BotStatus = 'offline'
    let message: string | undefined

    try {
        if (bot.provider === 'telegram') {
            const tgCreds = bot.credentials as TelegramCredentials
            const result = await tgGetMe({ token: tgCreds.token })

            if (result.success) {
                status = 'online'
                message = `@${result.botInfo?.username} está online`
            } else {
                status = 'error'
                message = result.error
            }
        }

        if (bot.provider === 'discord') {
            const dcCreds = bot.credentials as DiscordCredentials
            const result = await dcValidateToken({
                applicationId: dcCreds.applicationId,
                publicKey: dcCreds.publicKey,
                token: dcCreds.token,
            })

            if (result.success) {
                status = 'online'
                message = `${result.botInfo?.username} está online`
            } else {
                status = 'error'
                message = result.error
            }
        }

        // Atualiza status no banco
        await dbUpdateBotStatus({
            db,
            id: bot.id,
            status,
            statusMessage: message,
        })

        return {
            success: status === 'online',
            status,
            message,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

        await dbUpdateBotStatus({
            db,
            id: bot.id,
            status: 'error',
            statusMessage: errorMessage,
        })

        return {
            success: false,
            status: 'error',
            message: errorMessage,
        }
    }
}
