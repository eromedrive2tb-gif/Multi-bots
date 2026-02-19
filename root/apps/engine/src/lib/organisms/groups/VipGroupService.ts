/**
 * ORGANISM: VipGroupService
 * Responsabilidade: Gerenciamento de Grupos VIP e Communities
 * Use cases: Registrar grupo, Listar, Remover, Validar permissões
 */

import { v4 as uuidv4 } from 'uuid'
import type { VipGroup, CreateVipGroupDTO, UpdateVipGroupDTO, Result, UniversalContext } from '../../../core/types'
import type { IVipGroupService } from '../../../core/contracts/VipGroupService'
import {
    dbGetVipGroups,
    dbGetVipGroupById,
    dbSaveVipGroup,
    dbDeleteVipGroup,
    dbGetBots
} from '../../atoms'
import { tgGetChat } from '../../atoms/telegram/tg-get-chat'
import { dcGetGuild } from '../../atoms/discord/dc-get-guild'
import { dcGetGuilds } from '../../atoms/discord/dc-get-guilds'

export class VipGroupService implements IVipGroupService {
    constructor(
        private db: D1Database,
        private tenantId: string
    ) { }

    /**
     * Lista todos os grupos do tenant
     */
    async listGroups(): Promise<Result<VipGroup[]>> {
        return dbGetVipGroups({ db: this.db, tenantId: this.tenantId })
    }

    /**
     * Obtém um grupo por ID
     */
    async getGroup(id: string): Promise<Result<VipGroup>> {
        const result = await dbGetVipGroupById({ db: this.db, tenantId: this.tenantId, id })

        if (result.success && !result.data) {
            return { success: false, error: 'Grupo não encontrado' }
        }

        if (!result.success) {
            return { success: false, error: result.error }
        }

        return { success: true, data: result.data! }
    }

    /**
     * Registra um novo grupo com validação no provedor
     */
    async registerGroup(data: CreateVipGroupDTO): Promise<Result<VipGroup>> {
        // 1. Validar no provedor se o bot tem acesso
        // Precisamos de um bot do tenant para verificar
        // Se data.botId for fornecido, usamos ele. Se não, pegamos qualquer um do mesmo provider.

        let botToken = ''

        if (data.botId) {
            // TODO: Buscar bot específico (falta atom dbGetBotById, usando dbGetBots por enquanto ou assumindo que data.botId é válido se passado)
            // Por simplificação e performance, vamos buscar todos os bots e filtrar.
            const bots = await dbGetBots({ db: this.db, tenantId: this.tenantId })

            const bot = bots.find(b => b.id === data.botId)
            if (!bot) return { success: false, error: 'Bot informado não encontrado no tenant' }

            if (bot.provider !== data.provider) return { success: false, error: 'Bot informado não é do mesmo provedor do grupo' }

            // Extract token safely
            if (data.provider === 'telegram') {
                botToken = (bot.credentials as any).token
            } else {
                botToken = (bot.credentials as any).token
            }
        } else {
            // Tenta achar qualquer bot do provedor
            const bots = await dbGetBots({ db: this.db, tenantId: this.tenantId })

            const bot = bots.find(b => b.provider === data.provider && b.status === 'online')
            if (!bot) return { success: false, error: `Nenhum bot ${data.provider} online encontrado para validar o grupo` }

            if (data.provider === 'telegram') {
                botToken = (bot.credentials as any).token
            } else {
                botToken = (bot.credentials as any).token
            }
        }

        // 2. Chama Atom de validação (getChat / getGuild)
        if (data.provider === 'telegram') {
            const chatResult = await tgGetChat({ token: botToken, chatId: data.providerId })
            if (!chatResult.success) {
                return { success: false, error: `Falha ao validar grupo no Telegram: ${chatResult.error}` }
            }
            // Opcional: Atualizar nome/tipo com dados reais do Telegram
            if (chatResult.chat) {
                data.name = chatResult.chat.title || data.name
                // data.type mapping logic logic (supergroup -> community/group)
            }
        } else if (data.provider === 'discord') {
            const guildResult = await dcGetGuild({ token: botToken, guildId: data.providerId })
            if (!guildResult.success) {
                return { success: false, error: `Falha ao validar servidor no Discord: ${guildResult.error}` }
            }
            if (guildResult.guild) {
                data.name = guildResult.guild.name
            }
        }

        // 3. Salva no DB
        const newGroup: VipGroup = {
            id: uuidv4(),
            tenantId: this.tenantId,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        const saveResult = await dbSaveVipGroup({ db: this.db, tenantId: this.tenantId, group: newGroup })

        return saveResult
    }

    /**
     * Atualiza dados de um grupo
     */
    async updateGroup(id: string, data: UpdateVipGroupDTO): Promise<Result<VipGroup>> {
        const currentResult = await this.getGroup(id)
        if (!currentResult.success) return currentResult

        const current = currentResult.data

        const updatedGroup: VipGroup = {
            ...current,
            ...data,
            updatedAt: new Date().toISOString()
        }

        return dbSaveVipGroup({ db: this.db, tenantId: this.tenantId, group: updatedGroup })
    }

    /**
     * Sincroniza grupos dos bots do tenant
     */
    async syncGroups(): Promise<Result<any>> {
        try {
            // 1. Get all bots
            const bots = await dbGetBots({ db: this.db, tenantId: this.tenantId })
            const results = []

            // 2. Iterate bots
            for (const bot of bots) {
                if (bot.status !== 'online') continue

                const token = (bot.credentials as any).token

                if (bot.provider === 'discord') {
                    // Fetch guilds from Discord
                    const guildsResult = await dcGetGuilds({ token })

                    if (guildsResult.success && guildsResult.guilds) {
                        for (const guild of guildsResult.guilds) {
                            // Check if group already exists
                            // Note: This is inefficient (N+1), but safe for MVP. 
                            // TODO: Implement bulk get or cache
                            const existingGroups = await this.listGroups()
                            const exists = existingGroups.success ? existingGroups.data?.find((g: VipGroup) => g.providerId === guild.id) : undefined

                            if (!exists) {
                                // Create new group
                                await this.registerGroup({
                                    name: guild.name,
                                    provider: 'discord',
                                    providerId: guild.id,
                                    type: 'community',
                                    botId: bot.id,
                                    metadata: {}
                                })
                                results.push({ type: 'created', name: guild.name, provider: 'discord' })
                            } else {
                                // Update existing (optional, maybe update name?)
                                if (exists.name !== guild.name) {
                                    await this.updateGroup(exists.id, { name: guild.name })
                                    results.push({ type: 'updated', name: guild.name, provider: 'discord' })
                                }
                            }
                        }
                    }
                }
                else if (bot.provider === 'telegram') {
                    // Telegram logic: Iterate EXISTING groups and update metadata
                    // API does not support "get all chats I'm in"
                    const groups = await this.listGroups()
                    const tgGroups = (groups.success ? groups.data : [])?.filter((g: VipGroup) => g.provider === 'telegram') || []

                    for (const group of tgGroups) {
                        const chatResult = await tgGetChat({ token, chatId: group.providerId })

                        if (chatResult.success && chatResult.chat) {
                            if (group.name !== chatResult.chat.title) {
                                await this.updateGroup(group.id, { name: chatResult.chat.title || group.name })
                                results.push({ type: 'updated', name: chatResult.chat.title, provider: 'telegram' })
                            }
                        }
                    }
                }
            }

            return { success: true, data: results }

        } catch (error) {
            return { success: false, error: 'Falha na sincronização' }
        }
    }

    /**
     * Remove um grupo
     */
    async deleteGroup(id: string): Promise<Result<void>> {
        return dbDeleteVipGroup({ db: this.db, tenantId: this.tenantId, id })
    }

    /**
     * Sincroniza membros de um grupo específico
     */
    async syncGroupMembers(groupId: string): Promise<Result<{ synced: number, total?: number }>> {
        try {
            // 1. Get Group
            const groupResult = await this.getGroup(groupId)
            if (!groupResult.success || !groupResult.data) {
                return { success: false, error: 'Grupo não encontrado' }
            }
            const group = groupResult.data

            // 2. Get Bot
            let botId = group.botId
            let botToken = ''

            const bots = await dbGetBots({ db: this.db, tenantId: this.tenantId })

            if (botId) {
                const bot = bots.find(b => b.id === botId)
                if (bot) botToken = (bot.credentials as any).token
            }

            if (!botToken) {
                // Fallback: Use any valid bot for this provider
                const bot = bots.find(b => b.provider === group.provider && b.status === 'online')
                if (bot) {
                    botToken = (bot.credentials as any).token
                    botId = bot.id
                }
            }

            if (!botToken) {
                return { success: false, error: 'Nenhum bot disponível para sincronizar este grupo' }
            }

            let syncedCount = 0
            let totalMembers = 0

            // 3. Sync Logic based on Provider
            if (group.provider === 'discord') {
                const { dcGetGuildMembers } = await import('../../atoms/discord/dc-get-guild-members')
                const membersResult = await dcGetGuildMembers({ token: botToken, guildId: group.providerId })

                if (membersResult.success && membersResult.members) {
                    totalMembers = membersResult.members.length

                    for (const member of membersResult.members) {
                        if (member.user.bot) continue

                        await this.addMember({
                            groupId: group.id,
                            customerId: member.user.id,
                            status: 'member', // Default to member, roles logic needed for admin?
                            provider: 'dc',
                            tenantId: this.tenantId,
                            username: member.user.username, // Discriminator is legacy, username is unique now usually
                            name: member.nick || member.user.username
                        })
                        syncedCount++
                    }
                } else {
                    return { success: false, error: membersResult.error || 'Falha ao buscar membros do Discord' }
                }

            } else if (group.provider === 'telegram') {
                const { tgGetChatAdministrators } = await import('../../atoms/telegram/tg-get-chat-administrators')
                const { tgGetChatMemberCount } = await import('../../atoms/telegram/tg-get-chat-member-count')

                // 3.1 Sync Admins (only fully listable members)
                const adminsResult = await tgGetChatAdministrators({ token: botToken, chatId: group.providerId })

                if (adminsResult.success && adminsResult.administrators) {
                    for (const admin of adminsResult.administrators) {
                        if (admin.user.is_bot) continue

                        await this.addMember({
                            groupId: group.id,
                            customerId: String(admin.user.id),
                            status: admin.status === 'creator' ? 'administrator' : 'administrator',
                            provider: 'tg',
                            tenantId: this.tenantId,
                            username: admin.user.username,
                            name: admin.user.first_name
                        })
                        syncedCount++
                    }
                }

                // 3.2 Update Member Count Metadata
                const countResult = await tgGetChatMemberCount({ token: botToken, chatId: group.providerId })
                if (countResult.success && countResult.count) {
                    totalMembers = countResult.count
                    await this.updateGroup(group.id, {
                        metadata: { ...group.metadata, member_count: totalMembers, last_sync: new Date().toISOString() }
                    })
                }
            }

            return { success: true, data: { synced: syncedCount, total: totalMembers } }

        } catch (error) {
            console.error('Error syncing group members:', error)
            return { success: false, error: 'Erro interno ao sincronizar membros' }
        }
    }

    // ============================================
    // MEMBER MANAGEMENT
    // ============================================

    /**
     * Adiciona ou atualiza um membro no grupo
     */
    async addMember(data: {
        groupId: string,
        customerId: string, // This is EXTERNAL ID (e.g. 123456789)
        status: 'member' | 'administrator' | 'left' | 'kicked' | 'restricted',
        provider: 'tg' | 'dc',
        tenantId: string,
        username?: string,
        name?: string
    }): Promise<Result<void>> {
        try {
            // 1. Resolve or Create Customer (Internal ID)
            // We need the internal UUID for the relation
            let internalCustomerId: string

            const { dbUpsertCustomer } = await import('../../atoms/database/db-upsert-customer')

            // Note: dbUpsertCustomer atom handles the logic of finding by external_id or creating
            const customerResult = await dbUpsertCustomer({
                db: this.db,
                tenantId: data.tenantId,
                externalId: data.customerId,
                provider: data.provider,
                name: data.name || 'Unknown',
                username: data.username
            })

            if (!customerResult.success || !customerResult.data) {
                return { success: false, error: 'Falha ao processar cliente' }
            }

            internalCustomerId = customerResult.data.id

            // 2. Upsert member record using Atom
            const { dbSaveVipGroupMember } = await import('../../atoms/groups/db-save-vip-group-member')
            // Map restricted to member or handle it. For now, we cast as any if atom supports it, or map it.
            // valid statuses: 'member' | 'administrator' | 'left' | 'kicked'
            // 'restricted' is not in the db schema status enum, mapping to 'member' for now or need to update schema/atom.
            const validStatus = data.status === 'restricted' ? 'member' : data.status

            return await dbSaveVipGroupMember({
                db: this.db,
                id: uuidv4(),
                tenantId: data.tenantId,
                groupId: data.groupId,
                customerId: internalCustomerId,
                status: validStatus,
                joinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })

        } catch (e) {
            console.error('Error adding member:', e)
            return { success: false, error: 'Falha ao adicionar membro' }
        }
    }

    /**
     * Atualiza status do membro
     */
    async updateMemberStatus(
        groupId: string,
        customerId: string,
        status: 'member' | 'administrator' | 'left' | 'kicked'
    ): Promise<Result<void>> {
        // Resolve Customer Internal ID
        const { dbGetCustomerByExternalId } = await import('../../atoms/database/db-get-customer-by-external-id')
        const customerResult = await dbGetCustomerByExternalId({ db: this.db, tenantId: this.tenantId, externalId: customerId })

        if (!customerResult.success || !customerResult.data) {
            return { success: false, error: 'Cliente não encontrado' }
        }

        const customer = customerResult.data

        const { dbUpdateVipGroupMemberStatus } = await import('../../atoms/groups/db-update-vip-group-member-status')
        return await dbUpdateVipGroupMemberStatus({
            db: this.db,
            tenantId: this.tenantId,
            groupId,
            customerId: customer.id,
            status,
            leftAt: ['left', 'kicked'].includes(status) ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString()
        })
    }

    /**
     * Lista membros de um grupo
     */
    async getGroupMembers(groupId: string): Promise<Result<any[]>> {
        const { dbGetVipGroupMembers } = await import('../../atoms/groups/db-get-vip-group-members')
        return await dbGetVipGroupMembers({ db: this.db, groupId })
    }
}
