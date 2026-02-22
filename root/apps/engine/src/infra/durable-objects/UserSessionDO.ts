
import { DurableObject } from 'cloudflare:workers';
import { Env } from '../../core/types';
import { resolveCommand } from './commands/command-registry';
import { setupCommandRegistry } from './commands/command-setup';

// ============================================
// Initialize Command Registry (once per isolate)
// ============================================
setupCommandRegistry()

export class UserSessionDO extends DurableObject<Env> {
    // Tracks active WebSocket connections to prevent memory leaks and zombie connections
    private sessions: Map<WebSocket, { userId?: string, tenantId?: string, connectedAt: number }> = new Map();

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

            // Register new connection for tracking
            this.sessions.set(server, { connectedAt: Date.now() });

            return new Response(null, { status: 101, webSocket: client });
        }

        return new Response('Not Found', { status: 404 });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        if (typeof message !== 'string') return;

        try {
            const data = JSON.parse(message);
            const { action, reqId, payload, tenantId, userId } = data;

            // Update session tracking with user identity from first message
            const session = this.sessions.get(ws);
            if (session) {
                session.tenantId = tenantId || session.tenantId;
                session.userId = userId || session.userId;
                this.sessions.set(ws, session);
            }

            if (!action) return;

            console.log(`[UserSessionDO] Action: ${action} (${reqId || 'no-id'})`);

            // Resolve handler from registry
            const handler = resolveCommand(action);

            if (!handler) {
                ws.send(JSON.stringify({
                    type: 'response',
                    reqId,
                    success: false,
                    error: `Action '${action}' not implemented in UserSessionDO`
                }));
                return;
            }

            // Execute handler
            const result = await handler(this.env, payload, { tenantId, userId });

            // Check for special close signal (LOGOUT)
            const shouldClose = result.data && typeof result.data === 'object' && (result.data as any).__shouldClose;

            // Send response (strip internal flags)
            let responseData = result.data;
            if (shouldClose && responseData && typeof responseData === 'object') {
                const { __shouldClose, ...rest } = responseData as any;
                responseData = Object.keys(rest).length > 0 ? rest : undefined;
            }

            ws.send(JSON.stringify({
                type: 'response',
                reqId,
                success: result.success,
                data: result.success ? responseData : undefined,
                error: !result.success ? result.error : undefined
            }));

            // Close WebSocket after response if flagged
            if (shouldClose) {
                ws.close(1000, 'Logged out');
            }
        } catch (e: any) {
            console.error('[UserSessionDO] Error handle message:', e);
            ws.send(JSON.stringify({ type: 'response', success: false, error: e.message }));
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
        const session = this.sessions.get(ws);
        const userId = session?.userId || 'unknown';

        console.log(`[UserSessionDO] WebSocket closed (code: ${code}, reason: ${reason}, user: ${userId})`);

        // Real memory cleanup of zombie connections
        this.sessions.delete(ws);

        // Note: Future feature: Could dispatch DOMAIN_EVENT.USER_OFFLINE here
    }

    async webSocketError(ws: WebSocket, error: any) {
        const session = this.sessions.get(ws);
        const userId = session?.userId || 'unknown';

        console.error(`[UserSessionDO] WebSocket error (user: ${userId}):`, error);

        // Ensure cleanup on sudden errors
        this.sessions.delete(ws);
    }
}
