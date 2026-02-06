/**
 * MOLECULE: validate-and-save-bot
 * Responsabilidade: Valida token com o provider + salva no banco
 * Compõe: tg-get-me ou dc-validate-token + db-save-bot
 */

import { tgGetMe } from '../atoms/telegram'
import { dcValidateToken } from '../atoms/discord'
import { dbSaveBot } from '../atoms/database'
import type { Bot, BotCredentials, BotProvider, TelegramCredentials, DiscordCredentials } from '../../core/types'

export interface ValidateAndSaveBotProps {
    db: D1Database
    tenantId: string
    name: string
    provider: BotProvider
    credentials: BotCredentials
    baseWebhookUrl: string
}

export interface ValidateAndSaveBotResult {
    success: boolean
    bot?: Bot
    botUsername?: string
    error?: string
}

function generateId(): string {
    return crypto.randomUUID()
}

function generateWebhookSecret(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function validateAndSaveBot({
    db,
    tenantId,
    name,
    provider,
    credentials,
    baseWebhookUrl,
}: ValidateAndSaveBotProps): Promise<ValidateAndSaveBotResult> {
    // Step 1: Validar credenciais com o provider
    if (provider === 'telegram') {
        const tgCreds = credentials as TelegramCredentials
        const validation = await tgGetMe({ token: tgCreds.token })

        if (!validation.success) {
            return {
                success: false,
                error: validation.error || 'Token Telegram inválido',
            }
        }

        // Step 2: Salvar no banco
        const botId = generateId()
        const webhookSecret = generateWebhookSecret()

        const bot = await dbSaveBot({
            db,
            id: botId,
            tenantId,
            name: name || validation.botInfo?.name || 'Bot Telegram',
            provider,
            credentials,
            webhookSecret,
        })

        return {
            success: true,
            bot,
            botUsername: validation.botInfo?.username,
        }
    }

    if (provider === 'discord') {
        const dcCreds = credentials as DiscordCredentials
        const validation = await dcValidateToken({
            applicationId: dcCreds.applicationId,
            publicKey: dcCreds.publicKey,
            token: dcCreds.token,
        })

        if (!validation.success) {
            return {
                success: false,
                error: validation.error || 'Credenciais Discord inválidas',
            }
        }

        // Step 2: Salvar no banco
        const botId = generateId()
        const webhookSecret = generateWebhookSecret()

        const bot = await dbSaveBot({
            db,
            id: botId,
            tenantId,
            name: name || validation.botInfo?.name || 'Bot Discord',
            provider,
            credentials,
            webhookSecret,
        })

        return {
            success: true,
            bot,
            botUsername: validation.botInfo?.username,
        }
    }

    return {
        success: false,
        error: 'Provider não suportado',
    }
}
