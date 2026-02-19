
import { DurableObject } from 'cloudflare:workers';
import { BroadcastService } from '../../lib/organisms/broadcast/BroadcastService';
import { AnalyticsService } from '../../lib/organisms/analytics/AnalyticsService';
import { BotManagerService } from '../../lib/organisms';
import { BlueprintService } from '../../lib/organisms';
import { PaymentService } from '../../lib/organisms/payments/PaymentService';
import { AuthService } from '../../lib/organisms';
import { VipGroupService } from '../../lib/organisms';
import { savePage, listPages, getPage } from '../../lib/molecules/kv-page-manager';
import { dbGetCustomers, dbGetRedirects, dbGetRedirectStats } from '../../lib/atoms';
import { Env } from '../../core/types';

export class UserSessionDO extends DurableObject<Env> {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname.endsWith('/ws')) {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                return new Response('Expected Upgrade: websocket', { status: 426 });
            }

            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            this.ctx.acceptWebSocket(server);

            return new Response(null, { status: 101, webSocket: client });
        }

        return new Response('Not Found', { status: 404 });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        if (typeof message !== 'string') return;

        try {
            const data = JSON.parse(message);
            const { action, reqId, payload, tenantId, userId } = data;

            if (!action) return;

            console.log(`[UserSessionDO] Action received: ${action} (${reqId || 'no-id'})`);

            switch (action) {
                case 'FETCH_ANALYTICS': {
                    const service = new AnalyticsService(this.env.DB, tenantId);
                    const result = await service.getDashboard(payload || {});
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'CREATE_CAMPAIGN': {
                    const stub = this.env.CAMPAIGN_SCHEDULER_DO.get(this.env.CAMPAIGN_SCHEDULER_DO.idFromName(tenantId));
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.createCampaign(payload);

                    if (result.success && payload.immediate) {
                        await service.activateCampaign(result.data.id, this.env.CAMPAIGN_SCHEDULER_DO);
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
                    const result = await service.activateCampaign(payload.id, this.env.CAMPAIGN_SCHEDULER_DO);
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
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'SAVE_BLUEPRINT': {
                    const service = new BlueprintService(this.env.DB, this.env.BLUEPRINTS_KV, tenantId);
                    const result = await service.saveBlueprint(payload);
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? result.error : undefined
                    }));
                    break;
                }
                case 'FETCH_PAYMENTS_SUMMARY': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.getFinancialSummary(payload?.period || 'month');
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'FETCH_PAGES': {
                    const result = await listPages(this.env as any, tenantId);
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? (result as any).error : undefined
                    }));
                    break;
                }
                case 'SAVE_PAGE': {
                    const page = { ...payload, tenantId, updatedAt: Date.now() };
                    const result = await savePage(this.env as any, page);
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
                        data: result.success ? result.data : undefined,
                        error: !result.success ? (result as any).error : undefined
                    }));
                    break;
                }
                case 'FETCH_CUSTOMERS': {
                    const result = await dbGetCustomers({ db: this.env.DB, tenantId, ...payload });
                    ws.send(JSON.stringify({
                        type: 'response',
                        reqId,
                        success: result.success,
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
                case 'FETCH_RED_STATS': {
                    const result = await dbGetRedirectStats(this.env.DB, tenantId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'FETCH_GATEWAYS': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const gateways = await service.listGateways();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: gateways }));
                    break;
                }
                case 'SAVE_GATEWAY':
                case 'ADD_GATEWAY': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.addGateway(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_GATEWAY': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const result = await service.removeGateway(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_PAYMENTS_PLANS':
                case 'FETCH_PLANS': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const plans = await service.listPlans(payload?.activeOnly);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: plans }));
                    break;
                }
                case 'CREATE_PLAN':
                case 'ADD_PLAN': {
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
                case 'FETCH_PAYMENTS_TRANSACTIONS':
                case 'FETCH_TRANSACTIONS': {
                    const service = new PaymentService(this.env.DB, tenantId);
                    const txs = await service.listTransactions(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: txs }));
                    break;
                }
                case 'FETCH_BROADCASTS': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const broadcasts = await service.listBroadcasts();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: broadcasts }));
                    break;
                }
                case 'SEND_BROADCAST': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.createBroadcast(payload);
                    if (result.success && !payload.scheduledAt) {
                        await service.sendBroadcastNow(result.data.id);
                    }
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'CREATE_GROUP':
                case 'SAVE_VIP_GROUP': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = payload.id
                        ? await service.updateGroup(payload.id, payload)
                        : await service.registerGroup(payload);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SYNC_GROUPS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.syncGroups();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'SYNC_GROUP_MEMBERS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.syncGroupMembers(payload.groupId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_GROUP_MEMBERS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.getGroupMembers(payload.groupId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'UPDATE_PROFILE': {
                    const service = new AuthService(this.env.DB);
                    const result = await service.updateProfile(userId, payload.name);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'UPDATE_PASSWORD': {
                    const service = new AuthService(this.env.DB);
                    const result = await service.updatePassword(userId, payload.currentPassword, payload.newPassword);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'CLEAR_ANALYTICS': {
                    const service = new AnalyticsService(this.env.DB, tenantId);
                    const result = await service.clearMetrics();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: result.success ? undefined : result.error }));
                    break;
                }
                case 'FETCH_CAMPAIGNS': {
                    const { results } = await this.env.DB.prepare(
                        'SELECT * FROM remarketing_campaigns WHERE tenant_id = ? ORDER BY created_at DESC'
                    ).bind(tenantId).all();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: results }));
                    break;
                }
                case 'PAUSE_CAMPAIGN': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.pauseCampaign(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_CAMPAIGN': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.deleteCampaign(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'DELETE_GROUP':
                case 'DELETE_VIP_GROUP': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.deleteGroup(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_GROUPS': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.listGroups();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_GROUP': {
                    const service = new VipGroupService(this.env.DB, tenantId);
                    const result = await service.getGroup(payload.id);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: result.success, data: result.success ? result.data : undefined, error: !result.success ? result.error : undefined }));
                    break;
                }
                case 'FETCH_RECIPIENTS': {
                    const service = new BroadcastService(this.env.DB, tenantId);
                    const result = await service.getCampaignRecipients(payload.campaignId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: result }));
                    break;
                }
                case 'FETCH_ME': {
                    const user = await this.env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(userId).first();
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true, data: { user, tenantId } }));
                    break;
                }
                case 'LOGOUT': {
                    const service = new AuthService(this.env.DB);
                    await service.logout(payload.sessionId);
                    ws.send(JSON.stringify({ type: 'response', reqId, success: true }));
                    ws.close(1000, 'Logged out');
                    break;
                }
                default:
                    ws.send(JSON.stringify({ type: 'response', reqId, success: false, error: `Action ${action} not implemented in UserSessionDO` }));
            }
        } catch (e: any) {
            console.error('[UserSessionDO] Error handle message:', e);
            ws.send(JSON.stringify({ type: 'response', success: false, error: e.message }));
        }
    }
}
