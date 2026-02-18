import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';

interface SocketRequest {
    action: string;
    payload?: any;
    reqId: string;
    tenantId: string;
    userId?: string;
}

interface SocketResponse {
    type: 'response' | 'campaign_update';
    reqId?: string;
    success?: boolean;
    data?: any;
    error?: string;
    [key: string]: any;
}

interface SocketContextType {
    isConnected: boolean;
    request: <T = any>(action: string, payload?: any) => Promise<T>;
    socket: WebSocket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Export a way for non-react classes to access the socket if needed
export let globalSocket: {
    request: <T = any>(action: string, payload?: any) => Promise<T>
} | null = null;


export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { tenantId, user } = useUser();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const pendingRequests = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());

    useEffect(() => {
        if (!tenantId) return;

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/broadcasts/ws`;

            console.log('[Socket] Connecting...');
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log('[Socket] Connected');
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data) as SocketResponse;

                    // 1. Handle Request-Response
                    if (response.type === 'response' && response.reqId) {
                        const pending = pendingRequests.current.get(response.reqId);
                        if (pending) {
                            if (response.success) pending.resolve(response.data);
                            else pending.reject(new Error(response.error || 'Request failed'));
                            pendingRequests.current.delete(response.reqId);
                        }
                    }

                    // 2. Broadcast updates are handled via specific listeners or event system
                    // For now, we rely on the fact that this is a singleton and other hooks can listen if we add an emitter
                    // But for React Query, we will use a global emitter or process updates here.
                    if (response.type === 'campaign_update') {
                        // Global event discovery
                        window.dispatchEvent(new CustomEvent('socket_update', { detail: response }));
                    }

                } catch (e) {
                    console.error('[Socket] Message parse error:', e);
                }
            };

            ws.onclose = () => {
                console.warn('[Socket] Closed. Retrying in 5s...');
                setIsConnected(false);
                setTimeout(connect, 5000);
            };
        };

        connect();

        return () => {
            socketRef.current?.close();
        };
    }, [tenantId]);

    const request = useCallback(<T = any>(action: string, payload?: any): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
                return reject(new Error('Socket not connected'));
            }

            const reqId = crypto.randomUUID();
            const req: SocketRequest = {
                action,
                payload,
                reqId,
                tenantId: tenantId || '',
                userId: user?.id
            };

            pendingRequests.current.set(reqId, { resolve, reject });
            socketRef.current.send(JSON.stringify(req));

            // Timeout
            setTimeout(() => {
                const pending = pendingRequests.current.get(reqId);
                if (pending) {
                    pending.reject(new Error(`Request ${action} timed out`));
                    pendingRequests.current.delete(reqId);
                }
            }, 30000);
        });
    }, [tenantId, user?.id]);


    useEffect(() => {
        globalSocket = { request };
    }, [request]);

    const contextValue = useMemo(() => ({
        isConnected,
        request,
        socket: socketRef.current
    }), [isConnected, request]);

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within SocketProvider');
    return context;
};
