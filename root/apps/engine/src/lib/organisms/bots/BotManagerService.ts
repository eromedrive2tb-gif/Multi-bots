/**
 * ORGANISM: BotManagerService
 * Responsabilidade: CRUD completo de bots + health checks
 * Orquestra: Molecules e Atoms de database
 */

import { dbGetBots, dbGetBotById, dbDeleteBot, dbCleanupBotRecords } from '../../atoms'
import { dbGetBotBlueprints, dbToggleBotBlueprint } from '../../atoms'
import { tgSetWebhook, tgDeleteWebhook } from '../../atoms'
import { validateAndSaveBot } from '../../molecules'
import { healthCheckBot } from '../../molecules'
import { dcSyncCommands } from '../../atoms'
import { kvList } from '../../atoms'
import { TelegramProvider } from '../telegram/TelegramProvider'
import type { Bot, BotCredentials, BotProvider, TelegramCredentials, DiscordCredentials } from '../../../core/types'

export class BotManagerService {
    constructor(
        private db: D1Database,
        private blueprintsKv: KVNamespace,
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
        try {
            // Sanitize credentials to avoid common copy-paste errors
            const sanitizedCredentials = { ...credentials }
            if ('token' in sanitizedCredentials && typeof sanitizedCredentials.token === 'string') {
                sanitizedCredentials.token = sanitizedCredentials.token.trim()
            }
            if ('publicKey' in sanitizedCredentials && typeof sanitizedCredentials.publicKey === 'string') {
                sanitizedCredentials.publicKey = sanitizedCredentials.publicKey.trim()
            }
            if ('applicationId' in sanitizedCredentials && typeof sanitizedCredentials.applicationId === 'string') {
                sanitizedCredentials.applicationId = sanitizedCredentials.applicationId.trim()
            }

            // Delegate completely to the molecule which handles:
            // 1. Validation (tgGetMe / dcValidateToken)
            // 2. DB Saving
            // 3. Webhook Setup
            const result = await validateAndSaveBot({
                db: this.db,
                tenantId: this.tenantId,
                name,
                provider,
                credentials: sanitizedCredentials,
                baseWebhookUrl: this.baseWebhookUrl,
            })

            if (!result.success || !result.bot) {
                return { success: false, error: result.error || 'Erro desconhecido na criação do bot' }
            }

            // Initial health check
            await this.checkBotHealth(result.bot.id)

            return { success: true, bot: result.bot }
        } catch (error) {
            console.error('BotManager addBot error:', error)
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar bot' }
        }
    }

    /**
     * Remove um bot (limpa webhook + deleta)
     */
    async removeBot(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            const bot = await this.getBot(id)

            if (!bot) {
                return { success: false, error: 'Bot não encontrado' }
            }

            // Remove webhook do Telegram
            if (bot.provider === 'telegram') {
                const tgCreds = bot.credentials as TelegramCredentials
                await tgDeleteWebhook({ token: tgCreds.token })
            }

            // 1. Limpa registros vinculados (FK constraint)
            await dbCleanupBotRecords({
                db: this.db,
                botId: id,
                tenantId: this.tenantId
            })

            // 2. Deleta do banco
            const deleted = await dbDeleteBot({
                db: this.db,
                id,
                tenantId: this.tenantId,
            })

            return { success: deleted }
        } catch (error) {
            console.error('[BotManagerService] Error removing bot:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao remover bot'
            }
        }
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

        if (bot.provider === 'discord') {
            // Discord requires manual configuration in Developer Portal
            // Return success with URL so user knows what to configure
            const webhookUrl = `${this.baseWebhookUrl}/webhooks/discord/${bot.id}`
            return { success: true, webhookUrl }
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

    // ============================================
    // BLUEPRINT MANAGEMENT
    // ============================================

    async getBotBlueprints(botId: string) {
        return dbGetBotBlueprints({ db: this.db, botId })
    }

    async toggleBotBlueprint(botId: string, blueprintId: string, isActive: boolean) {
        // 1. Update in DB (Source of Truth for persistence)
        const result = await dbToggleBotBlueprint({ db: this.db, botId, blueprintId, isActive })

        if (!result.success) return result

        // 2. Sync to KV (Engine Cache)
        if (isActive) {
            // Fetch full blueprint
            const { dbGetBlueprintById } = await import('../../atoms/database/db-get-blueprints')
            const { saveBlueprintToKv } = await import('../../molecules/kv/kv-blueprint-manager')

            const bpResult = await dbGetBlueprintById({ db: this.db, tenantId: this.tenantId, id: blueprintId })

            if (bpResult.success && bpResult.data) {
                await saveBlueprintToKv(this.blueprintsKv, this.tenantId, bpResult.data)
                console.log(`[BotManager] Synced blueprint ${blueprintId} to KV for tenant ${this.tenantId}`)
            } else {
                console.error(`[BotManager] Failed to fetch blueprint ${blueprintId} for KV sync`)
            }
        } else {
            // TODO: Remove from KV or Trigger Index?
            // Currently kv-blueprint-manager doesn't support delete, but Engine checks DB active status too.
            // So leaving it in KV is fine, Engine will block execution if DB says inactive.
        }

        return result
    }

    /**
     * Sincroniza comandos do bot com o provider (Discord Slash Commands)
     * APENAS blueprints ativos para este bot serão sincronizados!
     */
    async syncBotCommands(id: string, kv: KVNamespace): Promise<{ success: boolean; error?: string }> {
        const bot = await this.getBot(id)

        if (!bot) {
            return { success: false, error: 'Bot não encontrado' }
        }

        if (bot.provider !== 'discord') {
            return { success: false, error: 'Sincronização de comandos apenas para Discord' }
        }

        // 1. Busca todos os triggers ativos do tenant no D1 (Source of Truth)
        const { dbGetBlueprints } = await import('../../atoms')
        const blueprintsResult = await dbGetBlueprints({ db: this.db, tenantId: this.tenantId, activeOnly: true })

        if (!blueprintsResult.success) {
            return { success: false, error: blueprintsResult.error }
        }

        // 2. Busca ativação específica do bot
        const botBlueprintsResult = await this.getBotBlueprints(id)
        const activeBlueprintIds = new Set<string>()

        if (botBlueprintsResult.success) {
            botBlueprintsResult.data.forEach(bp => {
                if (bp.isActive) activeBlueprintIds.add(bp.blueprintId)
            })
        }

        // 3. Filtra apenas blueprints ativos para ESTE bot
        const triggers = blueprintsResult.data
            .filter(bp => activeBlueprintIds.has(bp.id))
            .map(bp => bp.trigger)

        // 4. Transforma triggers em comandos Discord
        const commands = triggers
            .filter(t => t.startsWith('/'))
            .map(t => ({
                name: t.replace(/^\//, '').toLowerCase(),
                description: `Aciona o fluxo ${t}`,
                type: 1 // CHAT_INPUT
            }))

        // MESMO SE TIVER 0 COMANDOS, TEM QUE ENVIAR ARRAY VAZIO PRA LIMPAR NO DISCORD

        // 5. Envia para o Discord
        const dcCreds = bot.credentials as DiscordCredentials
        return dcSyncCommands({
            applicationId: dcCreds.applicationId,
            token: dcCreds.token,
            commands
        })
    }
}
