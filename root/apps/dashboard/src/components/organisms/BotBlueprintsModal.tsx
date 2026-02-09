/** @jsxImportSource react */
import React, { useState, useEffect } from 'react'
import { Modal } from '../molecules/Modal'
import { Button } from '../atoms/Button'
import { useQuery } from '@tanstack/react-query'
import type { Bot, Blueprint } from '../../core/types'
import { analyzeCompatibility } from '../../lib/shared/blueprint-compatibility'

interface BotBlueprintsModalProps {
    isOpen: boolean
    onClose: () => void
    bot: Bot
}

export const BotBlueprintsModal: React.FC<BotBlueprintsModalProps> = ({ isOpen, onClose, bot }) => {
    const [isSyncing, setIsSyncing] = useState(false)

    // Fetch all blueprints
    const { data: blueprints = [], isLoading } = useQuery<Blueprint[]>({
        queryKey: ['blueprints'],
        queryFn: async () => {
            const response = await fetch('/api/blueprints')
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        enabled: isOpen
    })

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const response = await fetch(`/api/bots/${bot.id}/sync`, {
                method: 'POST'
            })
            const result = await response.json() as any
            if (result.success) {
                alert('Comandos sincronizados com sucesso!')
                onClose()
            } else {
                alert(`Erro ao sincronizar: ${result.error}`)
            }
        } catch (err) {
            alert('Erro de conexão ao sincronizar')
        } finally {
            setIsSyncing(false)
        }
    }

    if (!isOpen) return null

    // Analyze compatibility for each blueprint
    const analyzed = blueprints.map(bp => ({
        ...bp,
        analysis: analyzeCompatibility(bp, bot.provider)
    }))

    // Filter only those with triggers (commands)
    const commandBlueprints = analyzed.filter(bp => bp.trigger && bp.trigger.startsWith('/'))

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Gerenciar Comandos - ${bot.name}`}
            size="lg"
        >
            <div className="modal-content">
                <div className="info-box">
                    <p>
                        Abaixo estão os fluxos que possuem gatilhos de comando (ex: <code>/start</code>).
                        Clique em <strong>Sincronizar</strong> para registrá-los no Discord.
                    </p>
                </div>

                {isLoading ? (
                    <div className="loading">Carregando blueprints...</div>
                ) : (
                    <div className="blueprint-list">
                        {commandBlueprints.length === 0 ? (
                            <div className="empty">Nenhum comando encontrado nos blueprints.</div>
                        ) : (
                            commandBlueprints.map(bp => (
                                <div key={bp.id} className={`blueprint-item ${bp.analysis.level}`}>
                                    <div className="bp-info">
                                        <span className="bp-trigger">{bp.trigger}</span>
                                        <span className="bp-name">{bp.name}</span>
                                    </div>
                                    <div className="bp-status">
                                        {bp.analysis.level === 'safe' && <span className="badge safe">✅ Compatível</span>}
                                        {bp.analysis.level === 'warning' && <span className="badge warning">⚠️ Atenção</span>}
                                        {bp.analysis.level === 'error' && <span className="badge error">❌ Erro</span>}
                                    </div>
                                    {bp.analysis.issues.length > 0 && (
                                        <div className="bp-issues">
                                            {bp.analysis.issues.map((issue, idx) => (
                                                <div key={idx} className="issue-item">
                                                    • {issue.message}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="modal-actions">
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                    <Button
                        variant="primary"
                        onClick={handleSync}
                        disabled={isLoading || isSyncing || commandBlueprints.length === 0}
                    >
                        {isSyncing ? 'Sincronizando...' : '⚡ Sincronizar Comandos'}
                    </Button>
                </div>

                <style>{`
                    .info-box {
                        background: rgba(59, 130, 246, 0.1);
                        border: 1px solid rgba(59, 130, 246, 0.2);
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        font-size: 0.9rem;
                        color: var(--text-secondary);
                    }

                    .blueprint-list {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        max-height: 400px;
                        overflow-y: auto;
                        margin-bottom: 20px;
                    }

                    .blueprint-item {
                        background: var(--card-bg);
                        border: 1px solid var(--border-color);
                        padding: 12px;
                        border-radius: 8px;
                        display: grid;
                        grid-template-columns: 1fr auto;
                        gap: 8px;
                    }

                    .blueprint-item.warning { border-color: #f59e0b; }
                    .blueprint-item.error { border-color: #ef4444; }

                    .bp-info { display: flex; flex-direction: column; }
                    .bp-trigger { font-family: monospace; font-weight: bold; color: var(--primary-color); }
                    .bp-name { font-size: 0.85rem; color: var(--text-secondary); }

                    .bp-issues {
                        grid-column: 1 / -1;
                        background: rgba(0,0,0,0.2);
                        padding: 8px;
                        border-radius: 4px;
                        font-size: 0.8rem;
                        color: #fca5a5; /* Light red for error text */
                        margin-top: 8px;
                    }
                    .blueprint-item.warning .bp-issues { color: #fcd34d; } /* Light yellow */

                    .badge {
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: 500;
                    }
                    .badge.safe { background: rgba(16, 185, 129, 0.2); color: #34d399; }
                    .badge.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
                    .badge.error { background: rgba(239, 68, 68, 0.2); color: #f87171; }

                    .modal-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        padding-top: 20px;
                        border-top: 1px solid var(--border-color);
                    }
                `}</style>
            </div>
        </Modal>
    )
}
