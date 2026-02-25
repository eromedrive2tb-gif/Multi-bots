/** @jsxImportSource react */
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSocket } from '../../../client/context/SocketContext'

export const ClearMetricsButton: React.FC = () => {
    const { request } = useSocket()
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleClear = async () => {
        setLoading(true)
        try {
            await request('CLEAR_ANALYTICS')
            window.location.reload()
        } catch (e) {
            console.error(e)
            alert('Erro ao limpar métricas: ' + (e instanceof Error ? e.message : 'Erro desconhecido'))
        } finally {
            setLoading(false)
            setIsOpen(false)
        }
    }

    return (
        <>
            <button
                type="button"
                className="btn btn-sm btn-clear-metrics"
                title="Limpar Métricas"
                onClick={() => setIsOpen(true)}
            >
                🗑️ Limpar
            </button>

            {/* Modal */}
            {isOpen && createPortal(
                <div
                    className="modal-overlay open"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div className="modal-icon-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" className="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="modal-title">
                                    Limpar todas as métricas?
                                </h3>
                                <div className="modal-description">
                                    <p>Esta ação removerá permanentemente <strong>todos os dados</strong> de analytics (fluxos, conversões, erros) deste tenant.</p>
                                    <span className="modal-warning-text">Esta ação não pode ser desfeita.</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setIsOpen(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleClear}
                                disabled={loading}
                            >
                                {loading ? 'Limpando...' : 'Confirmar Limpeza'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
