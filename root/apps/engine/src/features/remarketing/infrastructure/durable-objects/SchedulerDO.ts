
import { DurableObject } from 'cloudflare:workers';
import { RemarketingJob, RemarketingJobSchema } from '../../domain/types';
import { MessageSenderRegistry } from '../../application/MessageSenderRegistry';
import { TelegramSender } from '../adapters/TelegramSender';
import { DiscordSender } from '../adapters/DiscordSender';
import { D1RemarketingLogRepository } from '../repositories/D1RemarketingLogRepository';
import { CampaignExecutor } from '../adapters/CampaignExecutor';

import { BroadcastService } from '../../../../lib/organisms/broadcast/BroadcastService';
import { AnalyticsService } from '../../../../lib/organisms/analytics/AnalyticsService';
import { BotManagerService } from '../../../../lib/organisms';
import { BlueprintService } from '../../../../lib/organisms';
import { PaymentService } from '../../../../lib/organisms/payments/PaymentService';
import { AuthService } from '../../../../lib/organisms';
import { VipGroupService } from '../../../../lib/organisms';
import { savePage, listPages, getPage } from '../../../../lib/molecules/kv-page-manager';
import {
    dbGetCustomers, dbTrackClick, dbGetRedirects, dbGetRedirectStats, dbClearCustomers, dbGetCustomerById, dbGetCustomerHistory,
    dbSaveVipGroup, dbDeleteVipGroup, dbGetVipGroups,
    dbSaveRedirect, dbDeleteRedirect, dbUpdateRedirect
} from '../../../../lib/atoms';
import { createCampaignSchema } from '../../../../core/broadcast-types';
import { blueprintSchema } from '../../../../core/types';
import { addPlanSchema } from '../../../../core/payment-types';

export interface Env {
    DB: D1Database;
    BLUEPRINTS_KV: KVNamespace;
    SESSIONS_KV: KVNamespace;
    PAGES_KV: KVNamespace;
    SCHEDULER_DO: DurableObjectNamespace;
    AUTH_SECRET: string;
}

export class SchedulerDO extends DurableObject<Env> {
    private registry: MessageSenderRegistry;
    private logRepository: D1RemarketingLogRepository;
    private broadcastCallback: (data: any) => void;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.registry = new MessageSenderRegistry();
        this.registry.register(new TelegramSender());
        this.registry.register(new DiscordSender());
        this.broadcastCallback = (data: any) => this.broadcast(data);
        this.registry.register(new CampaignExecutor(env.DB, this.broadcastCallback)); // Register CampaignExecutor with broadcast callback
        this.logRepository = new D1RemarketingLogRepository(env.DB);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        try {
            if (request.method === 'POST' && url.pathname === '/schedule') {
                console.log('[SchedulerDO] Received schedule request');
                const job = await request.json() as RemarketingJob; // Skip Zod validation due to DO bundling issues (validated at API level)

                try {
                    await this.ctx.storage.put(`job:${job.id}`, job);
                    console.log(`[SchedulerDO] Saved job ${job.id} to storage.`);
                } catch (storeError) {
                    console.error(`[SchedulerDO] Failed to save job:`, storeError);
                    throw storeError;
                }

                // Check if we need to update the alarm
                const currentAlarm = await this.ctx.storage.getAlarm();
                console.log(`[SchedulerDO] Current alarm: ${currentAlarm}, New Job Schedule: ${job.scheduledFor}`);

                if (currentAlarm === null || job.scheduledFor < currentAlarm) {
                    console.log(`[SchedulerDO] Setting alarm for ${job.scheduledFor} (${new Date(job.scheduledFor).toISOString()})`);
                    await this.ctx.storage.setAlarm(job.scheduledFor);
                    console.log(`[SchedulerDO] Alarm set successfully.`);
                } else {
                    console.log(`[SchedulerDO] Alarm not updated (existing alarm is sooner).`);
                }

                return new Response(JSON.stringify({ scheduled: true, jobId: job.id }), { status: 200 });
            }

            if (request.method === 'POST' && url.pathname === '/cancel') {
                const { jobId } = await request.json() as { jobId: string };
                await this.ctx.storage.delete(`job:${jobId}`);
                // We don't necessarily need to clear the alarm immediately, 
                // the alarm handler can handle the case where the job is missing.
                return new Response(JSON.stringify({ cancelled: true }), { status: 200 });
            }

            if (url.pathname.endsWith('/ws')) {
                const upgradeHeader = request.headers.get('Upgrade');
                if (!upgradeHeader || upgradeHeader !== 'websocket') {
                    return new Response('Expected Upgrade: websocket', { status: 426 });
                }

                const pair = new WebSocketPair();
                const [client, server] = Object.values(pair);

                // Hibernate!
                this.ctx.acceptWebSocket(server);

                return new Response(null, { status: 101, webSocket: client });
            }

            return new Response('Not Found', { status: 404 });
        } catch (error: any) {
            console.error('[SchedulerDO] Error processing request:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        if (typeof message !== 'string') return;

        try {
            const data = JSON.parse(message);
            const { action, reqId, payload, tenantId, userId } = data;

            if (!action) return;

            console.log(`[SchedulerDO] Action received: ${action} (${reqId || 'no-id'})`);

            // 1. Action Dispatcher
            switch (action) {
                case 'FETCH_CAMPAIGNS': {
                    const { results } = await this.env.DB.prepare(
                        'SELECT * FROM remarketing_campaigns WHERE tenant_id = ? ORDER BY created_at DESC'
                    ).bind(tenantId).all();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: results }));
                    break;
                }
                case 'FETCH_BOTS': {
                    const { results } = await this.env.DB.prepare(
                        'SELECT * FROM bots WHERE tenant_id = ? ORDER BY created_at DESC'
                    ).bind(tenantId).all();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: results }));
                    break;
                }
                case 'FETCH_RECIPIENTS': {
                    const { results } = await this.env.DB.prepare(
                        'SELECT * FROM remarketing_recipients WHERE campaign_id = ? ORDER BY updated_at DESC'
                    ).bind(payload.campaignId).all();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: results }));
                    break;
                }
                case 'FETCH_ANALYTICS': {
                    const service = new AnalyticsService(this.env.DB, tenantId);
                    const result = await service.getDashboard(payload || {});
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.data, error: result.error }));
                    break;
                }
                case 'CREATE_CAMPAIGN': {
                    const parseResult = createCampaignSchema.safeParse(payload);
                    if (!parseResult.success) {
                        ws.send(JSON.stringify({ type: 'response', reqId, success: false, error: 'Invalid input' }));
                        break;
                    }
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.createCampaign(parseResult.data);

                    if (result.success && payload.immediate) {
                        await service.activateCampaign(result.data.id, this.env.SCHEDULER_DO);
                    }

                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'ACTIVATE_CAMPAIGN': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.activateCampaign(payload.id, this.env.SCHEDULER_DO);
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'PAUSE_CAMPAIGN': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.pauseCampaign(payload.id);
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'DELETE_CAMPAIGN': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.deleteCampaign(payload.id);
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'FETCH_BOTS': {
                    const manager = new BotManagerService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId, '');
                    const bots = await manager.listBots();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: bots }));
                    break;
                }
                case 'FETCH_BLUEPRINTS': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.listBlueprints();
                    ws.send(JSON.stringify({
                        type: 'response', reqId, success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'FETCH_ME': {
                    // Auth info is typically already in the ws handshake or we can fetch it
                    // For now, return what we have in the tenant context
                    ws.send(JSON.stringify({
                        type: 'response', reqId, success: true,
                        data: { tenantId, user: { name: 'Usuário', email: '' } } // Placeholder, real auth should be injected
                    }));
                    break;
                }
                case 'FETCH_PAYMENTS_SUMMARY': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const summary = await service.getFinancialSummary(payload.start, payload.end);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: summary }));
                    break;
                }
                case 'FETCH_PAYMENTS_TRANSACTIONS': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const transactions = await service.listTransactions(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: transactions }));
                    break;
                }
                case 'FETCH_PAYMENTS_PLANS': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const plans = await service.listPlans(payload.activeOnly);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: plans }));
                    break;
                }
                case 'FETCH_CUSTOMERS': {
                    const result = await dbGetCustomers({
                        db: this.env.DB,
                        tenantId,
                        limit: payload.limit || 20,
                        offset: payload.offset || 0,
                        search: payload.search,
                        provider: payload.provider
                    });
                    ws.send(JSON.stringify({
                        type: 'response', reqId, success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? (result as any).error : undefined
                    }));
                    break;
                }
                case 'FETCH_PAGES': {
                    const result = await listPages(this.env as any, tenantId);
                    ws.send(JSON.stringify({
                        type: 'response', reqId, success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? (result as any).error : undefined
                    }));
                    break;
                }
                case 'FETCH_PAGE': {
                    const result = await getPage(this.env as any, tenantId, payload.id);
                    ws.send(JSON.stringify({
                        type: 'response', reqId, success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? (result as any).error : undefined
                    }));
                    break;
                }
                case 'FETCH_GROUPS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.listGroups();
                    ws.send(JSON.stringify({
                        type: 'response', reqId, success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? (result as any).error : undefined
                    }));
                    break;
                }
                case 'FETCH_REDIRECTS': {
                    const result = await dbGetRedirects({ db: this.env.DB, tenantId });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'FETCH_REDIRECTS_STATS': {
                    const result = await dbGetRedirectStats(this.env.DB, tenantId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'FETCH_BROADCASTS': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const broadcasts = await service.listBroadcasts(payload.status, payload.botId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: broadcasts }));
                    break;
                }
                case 'CREATE_PLAN': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.addPlan(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_PLAN': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.deletePlan(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'CLEAR_CUSTOMERS': {
                    const result = await dbClearCustomers({ db: this.env.DB, tenantId });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_CUSTOMER_DETAILS': {
                    const result = await dbGetCustomerById({ db: this.env.DB, tenantId, id: payload.id });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_CUSTOMER_HISTORY': {
                    const result = await dbGetCustomerHistory({ db: this.env.DB, tenantId, customerId: payload.id });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_BLUEPRINTS': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.listBlueprints();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_BLUEPRINT': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.getBlueprint(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SAVE_BLUEPRINT': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.saveBlueprint(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_BLUEPRINT': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.deleteBlueprint(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SAVE_PAGE': {
                    const page = { ...payload, tenantId, updatedAt: Date.now() };
                    const result = await savePage(this.env as any, page);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_GROUP': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.getGroup(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'CREATE_GROUP': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.registerGroup(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_GROUP': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.deleteGroup(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SYNC_GROUPS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.syncGroups();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_GROUP_MEMBERS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.getGroupMembers(payload.groupId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SYNC_GROUP_MEMBERS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.syncGroupMembers(payload.groupId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'KICK_MEMBER': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.updateMemberStatus(payload.groupId, payload.customerId, 'kicked');
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_BROADCASTS': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.listBroadcasts(payload?.status, payload?.botId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'SEND_BROADCAST': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const createResult = await service.createBroadcast(payload);
                    if (!createResult.success) {
                        ws.send(JSON.stringify({ type: 'response', reqId, success: false, error: createResult.error }));
                        break;
                    }

                    // If not scheduled, send now
                    if (!payload.scheduledAt) {
                        const sendResult = await service.sendBroadcastNow(createResult.data!.id!);
                        ws.send(JSON.stringify({ type: 'response', reqId, success: sendResult.success, data: sendResult.success ? sendResult.data : undefined, error: !sendResult.success ? sendResult.error : undefined }));
                    } else {
                        ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: createResult.data }));
                    }
                    break;
                }
                case 'FETCH_REDIRECTS': {
                    const result = await dbGetRedirects({ db: this.env.DB, tenantId });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'FETCH_RED_STATS': {
                    const result = await dbGetRedirectStats(this.env.DB, tenantId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'CREATE_REDIRECT': {
                    const id = crypto.randomUUID();
                    const result = await dbSaveRedirect({ db: this.env.DB, id, tenantId, ...payload });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'UPDATE_REDIRECT': {
                    const result = await dbUpdateRedirect({ db: this.env.DB, id: payload.id, tenantId, ...payload.data });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'DELETE_REDIRECT': {
                    const result = await dbDeleteRedirect(this.env.DB, payload.id, tenantId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'UPDATE_PROFILE': {
                    const service = new AuthService(this.env.DB);
                    const result = await service.updateProfile(userId!, payload.name);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: result.error }));
                    break;
                }
                case 'UPDATE_PASSWORD': {
                    const service = new AuthService(this.env.DB);
                    const result = await service.updatePassword(userId!, payload.currentPassword, payload.newPassword);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: result.error }));
                    break;
                }
                case 'FETCH_ME': {
                    const { results } = await this.env.DB.prepare(
                        'SELECT id, name, email, tenant_id FROM users WHERE id IN (SELECT user_id FROM sessions WHERE id = ?)'
                    ).bind(payload.sessionId).all(); // We need sessionId here.
                    // Simplified for now, assuming we might need a different approach if session isn't easily accessible.
                    // But if it's Zero-Fetch, maybe we can just return the current user if we have userId.
                    const user = await this.env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(userId).first();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: { user, tenantId } }));
                    break;
                }
                case 'FETCH_GATEWAYS': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.listGateways();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'SAVE_GATEWAY': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.addGateway(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_GATEWAY': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.removeGateway(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_CUSTOMER_HISTORY': {
                    const result = await dbGetCustomerHistory({ db: this.env.DB, customerId: payload.customerId, tenantId });
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'ADD_BOT': {
                    const service = new BotManagerService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId, ''); // Base URL can be empty for now or fetched from env
                    const result = await service.addBot(payload.name, payload.provider, payload.credentials);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.bot : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_BOT': {
                    const service = new BotManagerService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId, '');
                    const result = await service.removeBot(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'CHECK_BOT_HEALTH': {
                    const service = new BotManagerService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId, '');
                    const result = await service.checkBotHealth(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SYNC_BOT_COMMANDS': {
                    const service = new BotManagerService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId, '');
                    const result = await service.syncBotCommands(payload.id, this.env.BLUEPRINTS_KV);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_BOT_BLUEPRINTS': {
                    const service = new BotManagerService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId, '');
                    const result = await service.getBotBlueprints(payload.botId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'TOGGLE_BOT_BLUEPRINT': {
                    const service = new BotManagerService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId, '');
                    const result = await service.toggleBotBlueprint(payload.botId, payload.blueprintId, payload.isActive);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_BLUEPRINTS': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.listBlueprints();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_BLUEPRINT': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.getBlueprint(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SAVE_BLUEPRINT': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.saveBlueprint(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_BLUEPRINT': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.deleteBlueprint(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'CLEAR_ANALYTICS': {
                    const service = new AnalyticsService(this.env.DB, tenantId);
                    const result = await service.clearMetrics();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'LOGOUT': {
                    const service = new AuthService(this.env.DB);
                    await service.logout(payload.sessionId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true }));
                    break;
                }
                // More actions can be added here (CREATE, DELETE, etc.)
                default:
                    ws.send(JSON.stringify({ type: 'response', reqId, success: false, error: 'Unknown action' }));
            }

        } catch (e: any) {
            console.error('[SchedulerDO] Error in webSocketMessage:', e);
        }
    }

    async webSocketError(ws: WebSocket, error: any) { }

    private broadcast(data: any) {
        const payload = JSON.stringify(data);
        this.ctx.getWebSockets().forEach(ws => {
            try {
                ws.send(payload);
            } catch (e) {
                // Sockets managed by ctx don't need manual cleanup in hibernation mode
            }
        });
    }

    async alarm(): Promise<void> {
        console.log('[SchedulerDO] 🚨 ALARM HANDLER TRIGGERED 🚨');
        try {
            const jobsMap = await this.ctx.storage.list<RemarketingJob>({ prefix: 'job:' });
            const now = Date.now();
            const jobs = Array.from(jobsMap.values());

            // Filter jobs that are due
            const dueJobs = jobs.filter(job => job.scheduledFor <= now);

            let nextAlarmTime: number | null = null;

            // Determine the next alarm time from remaining jobs
            const futureJobs = jobs.filter(job => job.scheduledFor > now);
            if (futureJobs.length > 0) {
                nextAlarmTime = Math.min(...futureJobs.map(j => j.scheduledFor));
            }

            if (nextAlarmTime) {
                await this.ctx.storage.setAlarm(nextAlarmTime);
            }

            // Process due jobs
            for (const job of dueJobs) {
                try {
                    const sender = this.registry.getSender(job.channel);
                    await sender.send(job);

                    try {
                        await this.logRepository.save({
                            id: crypto.randomUUID(),
                            jobId: job.id,
                            tenantId: job.tenantId,
                            channel: job.channel,
                            status: 'success',
                            executedAt: Date.now(),
                            requestPayload: job.payload,
                        });
                    } catch (logError) {
                        console.error('[SchedulerDO] Failed to save success log:', logError);
                    }

                    // Handle Recurrence
                    if (job.recurrence) {
                        const nextTime = this.calculateNextRun(job.recurrence, job.scheduledFor);
                        if (nextTime) {
                            const nextJob = { ...job, scheduledFor: nextTime, attempts: 0, status: 'pending' };
                            await this.ctx.storage.put(`job:${job.id}`, nextJob);
                            // Verify alarm
                            const currentAlarm = await this.ctx.storage.getAlarm();
                            if (currentAlarm === null || nextTime < currentAlarm) {
                                await this.ctx.storage.setAlarm(nextTime);
                            }
                            continue; // Skip deletion
                        }
                    }

                } catch (error: any) {

                    if (error.name === 'RateLimitError' || (error.retryAfter && typeof error.retryAfter === 'number')) {
                        const retryAfter = error.retryAfter || 5000;
                        //console.log(`[Scheduler] Rate limit hit for job ${job.id}. Rescheduling in ${retryAfter}ms`);

                        const nextTime = Date.now() + retryAfter;
                        const nextJob = { ...job, scheduledFor: nextTime, status: 'pending' };
                        await this.ctx.storage.put(`job:${job.id}`, nextJob);

                        const currentAlarm = await this.ctx.storage.getAlarm();
                        if (currentAlarm === null || nextTime < currentAlarm) {
                            await this.ctx.storage.setAlarm(nextTime);
                        }
                        continue; // Skip deletion and failure logging
                    }

                    if (error.name === 'BlockError' || error.name === 'InvalidRequestError') {
                        console.warn(`[SchedulerDO] Job ${job.id} failed (Expected): ${error.message}`);
                    } else {
                        console.error(`[SchedulerDO] Unexpected failure for job ${job.id}:`, error);
                    }

                    try {
                        await this.logRepository.save({
                            id: crypto.randomUUID(),
                            jobId: job.id,
                            tenantId: job.tenantId,
                            channel: job.channel,
                            status: 'failure',
                            executedAt: Date.now(),
                            error: error.message,
                            requestPayload: job.payload,
                        });
                    } catch (logError) {
                        console.error('[SchedulerDO] Failed to save failure log:', logError);
                    }

                    // Retry logic could be implemented here (e.g., reschedule if attempts < maxAttempts)
                }

                // Remove the job from storage if not recurring or if next run calculation failed
                await this.ctx.storage.delete(`job:${job.id}`);
            }
        } catch (error) {
            console.error('[SchedulerDO] Alarm handler failed:', error);
        }
    }

    private calculateNextRun(recurrence: RemarketingJob['recurrence'], lastScheduled: number): number | null {
        if (!recurrence) return null;

        const now = Date.now();
        const baseTime = Math.max(now, lastScheduled);
        const date = new Date(baseTime);

        // Parse time HH:mm
        let [hours, minutes] = [0, 0];
        if (recurrence.time) {
            const parts = recurrence.time.split(':');
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
        }

        switch (recurrence.type) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                if (recurrence.time) {
                    date.setHours(hours, minutes, 0, 0);
                }
                return date.getTime();
            case 'weekly':
                date.setDate(date.getDate() + 7);
                if (recurrence.time) {
                    date.setHours(hours, minutes, 0, 0);
                }
                return date.getTime();
            // Add other types as needed
            default:
                return null;
        }
    }
}
