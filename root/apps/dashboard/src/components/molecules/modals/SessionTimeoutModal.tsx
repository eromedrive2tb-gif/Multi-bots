/** @jsxImportSource react */
import { FC, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, RefreshCw, Zap, ShieldAlert } from 'lucide-react'
import './SessionTimeoutModal.css'

interface SessionTimeoutModalProps {
    onReconnect: () => void
    onLogout?: () => void
    isReconnecting?: boolean
}

export const SessionTimeoutModal: FC<SessionTimeoutModalProps> = ({
    onReconnect,
    onLogout,
    isReconnecting = false
}) => {

    useEffect(() => {
        console.log('[SessionTimeoutModal] MOUNTED in DOM (Portal)');
        return () => console.log('[SessionTimeoutModal] UNMOUNTED');
    }, []);

    // Ensure document is available (SSR check)
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="session-modal-backdrop">
            <div className="session-modal-container">
                {/* Visual Accent - Top Gradient Glow */}
                <div className="session-modal-glow" />

                {/* System Status Indicator */}
                <div className="session-modal-status">
                    <div className="session-modal-dot" />
                    <span className="session-modal-status-text">Idle_Mode</span>
                </div>

                {/* Main Visual Component */}
                <div className="session-modal-icon-wrapper">
                    {/* Concentric Glow Rings */}
                    <div className="session-modal-ring-1" />
                    <div className="session-modal-ring-2" />

                    <div className="session-modal-icon-inner">
                        <ShieldAlert className="session-modal-icon" size={44} />
                    </div>
                </div>

                {/* Text Content */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 className="session-modal-title">
                        CONEXÃO<br />
                        <span className="session-modal-title-gradient">INTERROMPIDA</span>
                    </h2>

                    <p className="session-modal-text">
                        Sua sessão entrou em espera para <span className="session-modal-text-highlight">preservar sua conexão</span>. Reative para retomar o painel.
                    </p>
                </div>

                {/* Action Controls */}
                <div className="session-modal-actions">
                    <button
                        onClick={onReconnect}
                        disabled={isReconnecting}
                        className="session-modal-btn-primary"
                    >
                        {/* Shimmer Effect */}
                        <div className="session-modal-shimmer" />

                        <div className="session-modal-btn-content">
                            {isReconnecting ? (
                                <>
                                    <Loader2 className="animate-spin session-modal-icon" size={24} color="#020617" style={{ filter: 'none' }} />
                                    <span>Sincronizando...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="session-modal-refresh-icon" size={24} />
                                    <span>Estou de Volta</span>
                                </>
                            )}
                        </div>
                    </button>

                    {onLogout && (
                        <button onClick={onLogout} className="session-modal-btn-logout">
                            <Zap size={12} className="session-modal-logout-icon" />
                            Encerrar Sessão
                        </button>
                    )}
                </div>

                {/* Bottom Hardware Look Decoration */}
                <div className="session-modal-decor">
                    <div className="session-modal-decor-line" />
                    <div className="session-modal-decor-dot" />
                    <div className="session-modal-decor-line" />
                </div>
            </div>
        </div>,
        document.body
    )
}
