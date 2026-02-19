import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';
import { SessionTimeoutModal } from '../../components/molecules/modals/SessionTimeoutModal';

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

    // Socket State
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const pendingRequests = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());

    // Inactivity State
    const [isIdle, setIsIdle] = useState(false);
    const isIdleRef = useRef(false); // Ref to track idle state inside closures
    const lastActivity = useRef(Date.now());

    // DEBUG: 20 seconds timeout for testing
    // Was: 15 * 60 * 1000 (15 mins)
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

    // Sync Ref with State
    useEffect(() => {
        isIdleRef.current = isIdle;
    }, [isIdle]);

    const activityThrottler = useRef<NodeJS.Timeout | null>(null);

    // Activity Tracking & Timeout Logic
    useEffect(() => {
        // Core timeout check logic
        const checkTimeout = () => {
            if (isIdleRef.current) return; // Use ref check
            const now = Date.now();
            const elapsed = now - lastActivity.current;
            const remaining = INACTIVITY_TIMEOUT - elapsed;

            console.log(`[Socket Debug] Check: ${Math.floor(elapsed / 1000)}s elapsed, ${Math.floor(remaining / 1000)}s remaining`);

            if (elapsed > INACTIVITY_TIMEOUT) {
                console.warn('[Socket] Timeout reached! User is inactive. Closing connection.');
                setIsIdle(true); // Triggers re-render
                isIdleRef.current = true; // Urgent update for immediate logic
                if (socketRef.current) socketRef.current.close();
            }
        };

        const handleActivity = () => {
            // 1. First, strictly check if we are ALREADY timed out.
            if (Date.now() - lastActivity.current > INACTIVITY_TIMEOUT) {
                console.log('[Socket Debug] Activity detected but TIMEOUT reached. Triggering idle state.');
                checkTimeout();
                return;
            }

            // 2. If not timed out, update activity timestamp (Throttled)
            if (!activityThrottler.current) {
                // console.log('[Socket Debug] Activity detected. Resetting timer.');
                activityThrottler.current = setTimeout(() => {
                    lastActivity.current = Date.now();
                    activityThrottler.current = null;
                }, 1000); // Throttle updates to once per second
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Socket Debug] Tab became visible. Checking timeout immediately.');
                checkTimeout();
            }
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleActivity));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const interval = setInterval(checkTimeout, 5000); // Check every 5s

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
            if (activityThrottler.current) clearTimeout(activityThrottler.current);
        };
    }, []); // Empty dependency array because we mainly use refs or stable handlers

    const connect = useCallback(() => {
        if (!tenantId || isIdleRef.current) return;

        // Prevent multiple connections per render cycle if strict mode is on 
        // or if we have a viable connection
        if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) return;

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
                if (response.type === 'campaign_update') {
                    // Global event discovery
                    window.dispatchEvent(new CustomEvent('socket_update', { detail: response }));
                }

            } catch (e) {
                console.error('[Socket] Message parse error:', e);
            }
        };

        ws.onclose = () => {
            console.warn('[Socket] Closed.');
            setIsConnected(false);

            // Check REF not stale closure state
            // Use setTimeout to allow state to settle if needed, but Ref is immediate
            if (!isIdleRef.current) {
                console.log('[Socket] Reconnecting in 5s...');
                setTimeout(connect, 5000);
            } else {
                console.log('[Socket] Not reconnecting because user is idle.');
            }
        };
    }, [tenantId]); // Dependency only on tenantId

    // Initial connection management
    useEffect(() => {
        // We only connect if NOT idle
        if (!isIdle) {
            connect();
        }
        return () => {
            // Cleanup socket on unmount
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [connect, isIdle]);

    const handleReconnect = () => {
        console.log('[Socket Debug] Reconnect requested by user.');
        lastActivity.current = Date.now();
        setIsIdle(false);
        // Setting isIdle to false triggers the effect above which calls connect()
    };

    const request = useCallback(<T = any>(action: string, payload?: any): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
                console.warn('[Socket] Request attempted but socket is disconnected/idle');
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
            {isIdle && <SessionTimeoutModal onReconnect={handleReconnect} />}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within SocketProvider');
    return context;
};
