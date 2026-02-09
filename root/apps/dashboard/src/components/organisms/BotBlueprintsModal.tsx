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

    // Fetch bot blueprints with status
    const { data: blueprints = [], isLoading, refetch } = useQuery<(Blueprint & { isActive: boolean })[]>({
        queryKey: ['bot-blueprints', bot.id],
        queryFn: async () => {
            const response = await fetch(`/api/bots/${bot.id}/blueprints`)
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

    const handleToggle = async (blueprintId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/bots/${bot.id}/blueprints/${blueprintId}/toggle`, {
                method: 'POST',
                body: JSON.stringify({ isActive: !currentStatus })
            })
            const result = await response.json() as any
            if (result.success) {
                refetch()
            } else {
                alert('Erro ao atualizar status: ' + result.error)
            }
        } catch (e) {
            alert('Erro de conexão')
        }
    }

    if (!isOpen) return null

    // Analyze compatibility for each blueprint
    const analyzed = blueprints.map(bp => ({
        ...bp,
        analysis: analyzeCompatibility(bp, bot.provider)
    }))

    // Filter only those with triggers (commands) - or show all? 
    // Let's show all that have a trigger, as triggers are the entry points.
    const commandBlueprints = analyzed.filter(bp => bp.trigger)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Gerenciar Fluxos - ${bot.name}`}
            size="lg"
        >
            <div className="modal-content-inner">
                <div className="info-box">
                    <p>
                        Gerencie quais fluxos estão ativos para este bot.
                        {bot.provider === 'discord' && ' Para o Discord, lembre-se de Sincronizar após fazer alterações.'}
                    </p>
                </div>

                {isLoading ? (
                    <div className="loading">Carregando blueprints...</div>
                ) : (
                    <div className="blueprint-list">
                        {commandBlueprints.length === 0 ? (
                            <div className="empty">Nenhum blueprint encontrado.</div>
                        ) : (
                            commandBlueprints.map(bp => (
                                <div key={bp.id} className={`blueprint-item ${bp.analysis.level} ${bp.isActive ? 'active' : 'inactive'}`}>
                                    <div className="bp-main">
                                        <div className="bp-info">
                                            <span className="bp-trigger">{bp.trigger}</span>
                                            <span className="bp-name">{bp.name}</span>
                                        </div>
                                        <div className="bp-controls">
                                            <div className="bp-status">
                                                {bp.analysis.level === 'safe' && <span className="badge safe">✅ Compatível</span>}
                                                {bp.analysis.level === 'warning' && <span className="badge warning">⚠️ Atenção</span>}
                                                {bp.analysis.level === 'error' && <span className="badge error">❌ Erro</span>}
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={bp.isActive}
                                                    onChange={() => handleToggle(bp.id, bp.isActive)}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
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

                    {bot.provider === 'discord' && (
                        <Button
                            variant="primary"
                            onClick={handleSync}
                            disabled={isLoading || isSyncing}
                        >
                            {isSyncing ? 'Sincronizando...' : '⚡ Sincronizar Comandos'}
                        </Button>
                    )}
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
                        transition: all 0.2s;
                    }
                    
                    .blueprint-item.inactive {
                        opacity: 0.6;
                        filter: grayscale(0.8);
                    }
                    .blueprint-item.inactive:hover {
                        opacity: 0.9;
                        filter: grayscale(0);
                    }

                    .blueprint-item.warning { border-left: 4px solid #f59e0b; }
                    .blueprint-item.error { border-left: 4px solid #ef4444; }
                    .blueprint-item.safe { border-left: 4px solid #10b981; }

                    .bp-main {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .bp-info { display: flex; flex-direction: column; }
                    .bp-trigger { font-family: monospace; font-weight: bold; color: var(--primary-color); }
                    .bp-name { font-size: 0.85rem; color: var(--text-secondary); }

                    .bp-controls {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }

                    .bp-issues {
                        background: rgba(0,0,0,0.2);
                        padding: 8px;
                        border-radius: 4px;
                        font-size: 0.8rem;
                        color: #fca5a5;
                        margin-top: 12px;
                    }
                    .blueprint-item.warning .bp-issues { color: #fcd34d; }

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

                    /* Switch CSS */
                    .switch {
                        position: relative;
                        display: inline-block;
                        width: 44px;
                        height: 24px;
                    }
                    .switch input { opacity: 0; width: 0; height: 0; }
                    .slider {
                        position: absolute;
                        cursor: pointer;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: #374151;
                        transition: .4s;
                        border: 1px solid #4b5563;
                    }
                    .slider:before {
                        position: absolute;
                        content: "";
                        height: 18px;
                        width: 18px;
                        left: 2px;
                        bottom: 2px;
                        background-color: white;
                        transition: .4s;
                    }
                    input:checked + .slider { background-color: var(--primary-color); border-color: var(--primary-color); }
                    input:focus + .slider { box-shadow: 0 0 1px var(--primary-color); }
                    input:checked + .slider:before { transform: translateX(20px); }
                    .slider.round { border-radius: 24px; }
                    .slider.round:before { border-radius: 50%; }
                `}</style>
            </div>
        </Modal>
    )
}
