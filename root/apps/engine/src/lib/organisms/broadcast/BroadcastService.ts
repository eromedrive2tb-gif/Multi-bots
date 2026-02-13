/**
 * ORGANISM: BroadcastService
 * Gerenciamento completo de broadcasts e remarketing
 */

import type { Result } from '../../../core/types'
import type {
    Broadcast, CreateBroadcastInput,
    RemarketingCampaign, CreateCampaignInput,
    BroadcastStatus, RemarketingStatus
} from '../../../core/broadcast-types'
import { dbSaveBroadcast } from '../../atoms/database/db-save-broadcast'
import { dbGetBroadcasts, dbUpdateBroadcastStatus, dbDeleteBroadcast } from '../../atoms/database/db-get-broadcasts'
import { dbSaveCampaign, dbGetCampaigns, dbUpdateCampaignStatus, dbDeleteCampaign } from '../../atoms/database/db-remarketing'
import { dbGetBotById } from '../../atoms/database/db-get-bots'
import { executeBroadcast } from '../../molecules/broadcast/execute-broadcast'

export class BroadcastService {
    constructor(
        private db: D1Database,
        private tenantId: string
    ) { }

    // ============================================
    // BROADCASTS
    // ============================================

    async listBroadcasts(status?: BroadcastStatus, botId?: string): Promise<Broadcast[]> {
        try {
            return await dbGetBroadcasts({ db: this.db, tenantId: this.tenantId, status, botId })
        } catch (error) {
            throw new Error(`Erro ao listar broadcasts: ${error instanceof Error ? error.message : 'desconhecido'}`)
        }
    }

    async createBroadcast(input: CreateBroadcastInput): Promise<Result<Broadcast>> {
        try {
            const id = crypto.randomUUID()
            const broadcast = await dbSaveBroadcast({
                db: this.db, id, tenantId: this.tenantId,
                botId: input.botId, title: input.title, content: input.content,
                targetType: input.targetType, targetId: input.targetId,
                scheduledAt: input.scheduledAt,
                status: input.scheduledAt ? 'scheduled' : 'draft',
            })
            return { success: true, data: broadcast }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar broadcast' }
        }
    }

    async sendBroadcastNow(broadcastId: string): Promise<Result<{ delivered: number; failed: number }>> {
        try {
            // Buscar broadcast
            const broadcasts = await dbGetBroadcasts({ db: this.db, tenantId: this.tenantId })
            const broadcast = broadcasts.find(b => b.id === broadcastId)
            if (!broadcast) return { success: false, error: 'Broadcast não encontrado' }

            // Buscar bot
            const bot = await dbGetBotById({ db: this.db, id: broadcast.botId })
            if (!bot) return { success: false, error: 'Bot não encontrado' }

            // Marcar como "sending"
            await dbUpdateBroadcastStatus(this.db, broadcastId, 'sending')

            // Executar envio
            const result = await executeBroadcast({
                db: this.db, tenantId: this.tenantId,
                botId: bot.id, botToken: (bot.credentials as any).token || '',
                provider: bot.provider as 'tg' | 'dc',
                content: broadcast.content,
                targetType: broadcast.targetType, targetId: broadcast.targetId || undefined,
            })

            if (result.success) {
                await dbUpdateBroadcastStatus(this.db, broadcastId, 'sent', {
                    sentAt: new Date().toISOString(),
                    totalRecipients: result.data.totalRecipients,
                    deliveredCount: result.data.deliveredCount,
                    failedCount: result.data.failedCount,
                })
                return { success: true, data: { delivered: result.data.deliveredCount, failed: result.data.failedCount } }
            } else {
                await dbUpdateBroadcastStatus(this.db, broadcastId, 'failed')
                return { success: false, error: result.error }
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro no envio' }
        }
    }

    async deleteBroadcast(broadcastId: string): Promise<Result<boolean>> {
        try {
            const deleted = await dbDeleteBroadcast(this.db, broadcastId, this.tenantId)
            return deleted ? { success: true, data: true } : { success: false, error: 'Broadcast não encontrado' }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao excluir' }
        }
    }

    // ============================================
    // REMARKETING CAMPAIGNS
    // ============================================

    async listCampaigns(status?: RemarketingStatus): Promise<RemarketingCampaign[]> {
        try {
            return await dbGetCampaigns({ db: this.db, tenantId: this.tenantId, status })
        } catch (error) {
            throw new Error(`Erro ao listar campanhas: ${error instanceof Error ? error.message : 'desconhecido'}`)
        }
    }

    async createCampaign(input: CreateCampaignInput): Promise<Result<RemarketingCampaign>> {
        try {
            const id = crypto.randomUUID()
            const campaign = await dbSaveCampaign({
                db: this.db, id, tenantId: this.tenantId,
                name: input.name, segment: input.segment, botId: input.botId,
                content: input.content, filters: input.filters,
            })
            return { success: true, data: campaign }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar campanha' }
        }
    }

    async activateCampaign(campaignId: string): Promise<Result<boolean>> {
        try {
            const updated = await dbUpdateCampaignStatus(this.db, campaignId, 'active')
            return updated ? { success: true, data: true } : { success: false, error: 'Campanha não encontrada' }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao ativar' }
        }
    }

    async pauseCampaign(campaignId: string): Promise<Result<boolean>> {
        try {
            const updated = await dbUpdateCampaignStatus(this.db, campaignId, 'paused')
            return updated ? { success: true, data: true } : { success: false, error: 'Campanha não encontrada' }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao pausar' }
        }
    }

    async deleteCampaign(campaignId: string): Promise<Result<boolean>> {
        try {
            const deleted = await dbDeleteCampaign(this.db, campaignId, this.tenantId)
            return deleted ? { success: true, data: true } : { success: false, error: 'Campanha não encontrada' }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao excluir' }
        }
    }
}
