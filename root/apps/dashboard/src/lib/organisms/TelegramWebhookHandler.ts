/**
 * ORGANISM: TelegramWebhookHandler
 * Responsabilidade: Processa webhooks do Telegram e executa comandos
 * Orquestra: tg-handle-update, tg-send-text e operações de banco
 */

import { tgHandleUpdate, tgSendText, type TelegramUpdate } from '../atoms/telegram'
import { dbGetBotById } from '../atoms/database'
import type { TelegramCredentials } from '../../core/types'

export interface WebhookContext {
    db: D1Database
    botId: string
    tenantId: string
    userName: string
}

export interface WebhookResult {
    handled: boolean
    command?: string
    response?: string
}

export async function handleTelegramWebhook(
    update: TelegramUpdate,
    context: WebhookContext
): Promise<WebhookResult> {
    const parsed = tgHandleUpdate(update)

    if (!parsed.isCommand || !parsed.message) {
        return { handled: false }
    }

    // Get bot credentials
    const bot = await dbGetBotById({ db: context.db, id: context.botId })
    if (!bot) {
        return { handled: false }
    }

    const token = (bot.credentials as TelegramCredentials).token

    // Handle /health command
    if (parsed.command === 'health') {
        const response = `✅ <b>Bot Online e Funcionando!</b>\n\n` +
            `📊 <b>Status:</b> Conectado\n` +
            `🏢 <b>Tenant ID:</b> <code>${context.tenantId.slice(0, 8)}...</code>\n` +
            `👤 <b>Usuário:</b> ${context.userName}\n` +
            `🕐 <b>Timestamp:</b> ${new Date().toLocaleString('pt-BR')}\n\n` +
            `<i>Este bot está configurado e respondendo corretamente.</i>`

        await tgSendText({
            token,
            chatId: parsed.message.chatId,
            text: response,
            parseMode: 'HTML',
        })

        return {
            handled: true,
            command: 'health',
            response: 'Health check enviado',
        }
    }

    // Handle /start command
    if (parsed.command === 'start') {
        const response = `👋 <b>Olá!</b>\n\n` +
            `Eu sou um bot gerenciado pelo Multi-Bots Dashboard.\n\n` +
            `<b>Comandos disponíveis:</b>\n` +
            `/health - Verificar status do bot\n` +
            `/start - Mostrar esta mensagem`

        await tgSendText({
            token,
            chatId: parsed.message.chatId,
            text: response,
            parseMode: 'HTML',
        })

        return {
            handled: true,
            command: 'start',
            response: 'Welcome message enviada',
        }
    }

    return { handled: false }
}
