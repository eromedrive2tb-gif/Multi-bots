/**
 * ORGANISM: BotManagerService
 * Responsabilidade: CRUD completo de bots + health checks
 * Orquestra: Molecules e Atoms de database
 */

import { dbGetBots, dbGetBotById, dbDeleteBot } from '../atoms/database'
import { tgSetWebhook, tgDeleteWebhook } from '../atoms/telegram'
import { validateAndSaveBot } from '../molecules'
import { healthCheckBot } from '../molecules'
import type { Bot, BotCredentials, BotProvider, TelegramCredentials } from '../../core/types'

export class BotManagerService {
    constructor(
        private db: D1Database,
        private tenantId: string,
        private baseWebhookUrl: string
    ) { }

    /**
     * Lista todos os bots do tenant
     */
    async listBots(): Promise<Bot[]> {
        return dbGetBots({ db: this.db, tenantId: this.tenantId })
    }

    /**
     * Obtém um bot por ID (com verificação de tenant)
     */
    async getBot(id: string): Promise<Bot | null> {
        const bot = await dbGetBotById({ db: this.db, id })

        // Verificação de isolamento multi-tenant
        if (bot && bot.tenantId !== this.tenantId) {
            return null
        }

        return bot
    }

    /**
     * Adiciona um novo bot (valida + salva + configura webhook)
     */
    async addBot(
        name: string,
        provider: BotProvider,
        credentials: BotCredentials
    ): Promise<{ success: boolean; bot?: Bot; error?: string }> {
        const result = await validateAndSaveBot({
            db: this.db,
            tenantId: this.tenantId,
            name,
            provider,
            credentials,
            baseWebhookUrl: this.baseWebhookUrl,
        })

        if (!result.success || !result.bot) {
            return { success: false, error: result.error }
        }

        // Configura webhook para Telegram
        if (provider === 'telegram') {
            const tgCreds = credentials as TelegramCredentials
            const webhookUrl = `${this.baseWebhookUrl}/webhooks/telegram/${result.bot.id}`

            await tgSetWebhook({
                token: tgCreds.token,
                url: webhookUrl,
                secretToken: result.bot.webhookSecret,
            })
        }

        // Faz health check inicial
        await this.checkBotHealth(result.bot.id)

        return { success: true, bot: result.bot }
    }

    /**
     * Remove um bot (limpa webhook + deleta)
     */
    async removeBot(id: string): Promise<{ success: boolean; error?: string }> {
        const bot = await this.getBot(id)

        if (!bot) {
            return { success: false, error: 'Bot não encontrado' }
        }

        // Remove webhook do Telegram
        if (bot.provider === 'telegram') {
            const tgCreds = bot.credentials as TelegramCredentials
            await tgDeleteWebhook({ token: tgCreds.token })
        }

        // Deleta do banco
        const deleted = await dbDeleteBot({
            db: this.db,
            id,
            tenantId: this.tenantId,
        })

        return { success: deleted }
    }

    /**
     * Verifica saúde de um bot específico
     */
    async checkBotHealth(id: string): Promise<{ success: boolean; status?: string; error?: string }> {
        const bot = await this.getBot(id)

        if (!bot) {
            return { success: false, error: 'Bot não encontrado' }
        }

        const result = await healthCheckBot({ db: this.db, bot })

        return {
            success: result.success,
            status: result.status,
            error: result.message,
        }
    }

    /**
     * Verifica saúde de todos os bots do tenant
     */
    async checkAllBotsHealth(): Promise<void> {
        const bots = await this.listBots()

        await Promise.all(
            bots.map(bot => healthCheckBot({ db: this.db, bot }))
        )
    }

    /**
     * Define o webhook de um bot específico
     */
    async setBotWebhook(id: string): Promise<{ success: boolean; webhookUrl?: string; error?: string }> {
        const bot = await this.getBot(id)

        if (!bot) {
            return { success: false, error: 'Bot não encontrado' }
        }

        if (bot.provider === 'telegram') {
            const tgCreds = bot.credentials as TelegramCredentials
            const webhookUrl = `${this.baseWebhookUrl}/webhooks/telegram/${bot.id}`

            try {
                await tgSetWebhook({
                    token: tgCreds.token,
                    url: webhookUrl,
                    secretToken: bot.webhookSecret || undefined,
                })
                return { success: true, webhookUrl }
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Erro ao configurar webhook'
                }
            }
        }

        return { success: false, error: 'Provider não suportado para webhook automático' }
    }

    /**
     * Atualiza webhooks de todos os bots (útil após mudança de domínio)
     */
    async refreshAllWebhooks(): Promise<{ results: { botId: string; name: string; success: boolean; error?: string }[] }> {
        const bots = await this.listBots()
        const results = []

        for (const bot of bots) {
            if (bot.provider === 'telegram') {
                const tgCreds = bot.credentials as TelegramCredentials
                const webhookUrl = `${this.baseWebhookUrl}/webhooks/telegram/${bot.id}`

                try {
                    await tgSetWebhook({
                        token: tgCreds.token,
                        url: webhookUrl,
                        secretToken: bot.webhookSecret || undefined,
                    })
                    results.push({ botId: bot.id, name: bot.name, success: true })
                } catch (error) {
                    results.push({
                        botId: bot.id,
                        name: bot.name,
                        success: false,
                        error: error instanceof Error ? error.message : 'Erro desconhecido'
                    })
                }
            }
        }

        return { results }
    }
}
