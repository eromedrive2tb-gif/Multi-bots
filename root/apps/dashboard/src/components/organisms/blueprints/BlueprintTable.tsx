/** @jsxImportSource react */
import React from 'react'
import { Button } from '../../atoms/ui/Button'
import { Wrench, CheckCircle2, PauseCircle, Edit3, Code, Trash2 } from 'lucide-react'
import type { BlueprintListItem } from '../../../../../engine/src/core/types'

interface BlueprintTableProps {
    blueprints: BlueprintListItem[]
    isLoading: boolean
    onSelect: (id: string) => void
    onEditJson: (id: string) => void
    onDelete: (id: string) => void
}

export const BlueprintTable: React.FC<BlueprintTableProps> = ({
    blueprints,
    isLoading,
    onSelect,
    onEditJson,
    onDelete
}) => {
    if (isLoading) {
        return <div className="empty-state">Carregando blueprints...</div>
    }

    if (!blueprints || blueprints.length === 0) {
        return (
            <div className="empty-state glass-panel rounded-2xl p-8" style={{ marginTop: '2rem' }}>
                <span className="empty-icon text-cyan-neon flex justify-center mb-4"><Wrench size={48} /></span>
                <h3 className="text-white font-bold text-xl mb-2">Nenhum blueprint configurado</h3>
                <p className="text-slate-400">Crie seu primeiro blueprint para automatizar fluxos do bot</p>
            </div>
        )
    }

    return (
        <div className="blueprints-table-wrapper">
            <table className="blueprints-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Trigger</th>
                        <th>Versão</th>
                        <th>Status</th>
                        <th>Atualizado</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {blueprints.map(bp => (
                        <tr key={bp.id}>
                            <td>
                                <button
                                    className="blueprint-link-btn"
                                    onClick={() => onSelect(bp.id)}
                                >
                                    {bp.name}
                                </button>
                            </td>
                            <td>
                                <code className="trigger-code">{bp.trigger}</code>
                            </td>
                            <td>{bp.version}</td>
                            <td>
                                <span className={`status-badge flex items-center gap-1 ${bp.isActive ? 'active text-emerald-400' : 'inactive text-slate-400'}`}>
                                    {bp.isActive ? <><CheckCircle2 size={14} /> Ativo</> : <><PauseCircle size={14} /> Inativo</>}
                                </span>
                            </td>
                            <td>{new Date(bp.updatedAt).toLocaleDateString('pt-BR')}</td>
                            <td>
                                <div className="actions-row flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onSelect(bp.id)}
                                    >
                                        <Edit3 size={14} /> Visual
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onEditJson(bp.id)}
                                    >
                                        <Code size={14} /> JSON
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => onDelete(bp.id)}
                                        className="px-3"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <style>{`
                .blueprints-table-wrapper {
                    overflow-x: auto;
                    background: rgba(2, 6, 23, 0.6);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(6, 182, 212, 0.3);
                    border-radius: 1rem;
                }
                
                .blueprints-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .blueprints-table th,
                .blueprints-table td {
                    padding: 16px;
                    text-align: left;
                    border-bottom: 1px solid rgba(6, 182, 212, 0.15);
                }
                
                .blueprints-table th {
                    font-weight: 700;
                    color: var(--color-text-secondary);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    background: rgba(15, 23, 42, 0.5);
                }
                
                .blueprints-table tbody tr {
                    transition: background 0.2s ease;
                }
                .blueprints-table tbody tr:hover {
                    background: rgba(6, 182, 212, 0.05);
                }
                
                .blueprint-link-btn {
                    background: none;
                    border: none;
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0;
                    font-size: 1rem;
                    transition: color 0.2s ease;
                }
                
                .blueprint-link-btn:hover {
                    color: #06b6d4;
                }
                
                .trigger-code {
                    background: rgba(15, 23, 42, 0.8);
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid rgba(6, 182, 212, 0.2);
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.875rem;
                    color: #22d3ee;
                }
                
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 12px;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 700;
                }
                
                .status-badge.active {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                
                .status-badge.inactive {
                    background: rgba(100, 116, 139, 0.1);
                    border: 1px solid rgba(100, 116, 139, 0.2);
                }
                
                .empty-state {
                    text-align: center;
                }
            `}</style>
        </div>
    )
}
