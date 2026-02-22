/**
 * COMMAND HANDLER: Broadcasts & Campaigns (Remarketing)
 * Actions: FETCH_BROADCASTS, SEND_BROADCAST, CREATE_CAMPAIGN, ACTIVATE_CAMPAIGN,
 *          FETCH_CAMPAIGNS, PAUSE_CAMPAIGN, DELETE_CAMPAIGN, FETCH_RECIPIENTS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { BroadcastService } from '../../../../lib/organisms/broadcast/BroadcastService'

export const fetchBroadcasts: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BroadcastService(env.DB, meta.tenantId)
    const broadcasts = await service.listBroadcasts()
    return { success: true, data: broadcasts }
}

export const sendBroadcast: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BroadcastService(env.DB, meta.tenantId)
    const result = await service.createBroadcast(payload)

    // AMEAÇA NÍVEL 0 CORRIGIDA: Crash 1102 Evitado. 
    // Delega processamento massivo assíncrono para a Fila (Queue)
    if (result.success && !payload.scheduledAt && env.WEBHOOK_QUEUE) {
        // Enfileira Job
        await env.WEBHOOK_QUEUE.send({
            id: crypto.randomUUID(),
            type: 'PROCESS_BROADCAST', // Evento novo consumido pelo queue-consumer
            timestamp: Date.now(),
            tenantId: meta.tenantId,
            botId: payload.botId,
            provider: 'telegram', // O Consumer e Service resolverão isso, enviamos o padrão para tipagem
            idempotencyKey: `broadcast_${result.data.id}`,
            payload: { broadcastId: result.data.id }
        });

        // Update database to reflect queueing status
        const { dbUpdateBroadcastStatus } = await import('../../../../lib/atoms/database/db-get-broadcasts')
        await dbUpdateBroadcastStatus(env.DB, result.data.id, 'scheduled')
    }

    // Retorna HTTP Rápido com Status "Processando" via Socket para destravar Dashboard.
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const createCampaign: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BroadcastService(env.DB, meta.tenantId)
    const result = await service.createCampaign(payload)

    if (result.success && payload.immediate) {
        await service.activateCampaign(result.data.id, env.CAMPAIGN_SCHEDULER_DO)
    }

    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const activateCampaign: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BroadcastService(env.DB, meta.tenantId)
    const result = await service.activateCampaign(payload.id, env.CAMPAIGN_SCHEDULER_DO)
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const fetchCampaigns: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const { results } = await env.DB.prepare(
        'SELECT * FROM remarketing_campaigns WHERE tenant_id = ? ORDER BY created_at DESC'
    ).bind(meta.tenantId).all()
    return { success: true, data: results }
}

export const pauseCampaign: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BroadcastService(env.DB, meta.tenantId)
    const result = await service.pauseCampaign(payload.id)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const deleteCampaign: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BroadcastService(env.DB, meta.tenantId)
    const result = await service.deleteCampaign(payload.id)
    return {
        success: result.success,
        error: !result.success ? result.error : undefined
    }
}

export const fetchRecipients: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new BroadcastService(env.DB, meta.tenantId)
    const result = await service.getCampaignRecipients(payload.campaignId)
    return { success: true, data: result }
}
