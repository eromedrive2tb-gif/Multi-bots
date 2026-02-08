/** @jsxImportSource react */
import React from 'react'
import { Button } from '../atoms/Button'
import type { BlueprintListItem } from '../../core/types'

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
            <div className="empty-state">
                <span className="empty-icon">🔧</span>
                <h3>Nenhum blueprint configurado</h3>
                <p>Crie seu primeiro blueprint para automatizar fluxos do bot</p>
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
                                <span className={`status-badge ${bp.isActive ? 'active' : 'inactive'}`}>
                                    {bp.isActive ? '✅ Ativo' : '⏸️ Inativo'}
                                </span>
                            </td>
                            <td>{new Date(bp.updatedAt).toLocaleDateString('pt-BR')}</td>
                            <td>
                                <div className="actions-row">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onSelect(bp.id)}
                                    >
                                        ✏️ Visual
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onEditJson(bp.id)}
                                    >
                                        📝 JSON
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => onDelete(bp.id)}
                                    >
                                        🗑️
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
                }
                
                .blueprints-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .blueprints-table th,
                .blueprints-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .blueprints-table th {
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                
                .blueprint-link-btn {
                    background: none;
                    border: none;
                    color: var(--primary);
                    text-decoration: none;
                    font-weight: 500;
                    cursor: pointer;
                    padding: 0;
                    font-size: inherit;
                }
                
                .blueprint-link-btn:hover {
                    text-decoration: underline;
                }
                
                .trigger-code {
                    background: var(--code-bg);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.875rem;
                }
                
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                
                .status-badge.active {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }
                
                .status-badge.inactive {
                    background: rgba(107, 114, 128, 0.1);
                    color: #6b7280;
                }
                
                .actions-row {
                    display: flex;
                    gap: 8px;
                }

                .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-secondary);
                }
                
                .empty-icon {
                    font-size: 3rem;
                    display: block;
                    margin-bottom: 16px;
                }
            `}</style>
        </div>
    )
}
