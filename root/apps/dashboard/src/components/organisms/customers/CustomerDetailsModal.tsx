/** @jsxImportSource react */
import React from 'react'
import { Modal } from '../../molecules/ui/Modal'
import { Button } from '../../atoms/ui/Button'
import { useSocket } from '../../../client/context/SocketContext'
import type { Customer } from '../../../../engine/src/core/types'
import { useQuery } from '@tanstack/react-query'

interface CustomerDetailsModalProps {
    customer: Customer | null
    onClose: () => void
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ customer, onClose }) => {
    const { request } = useSocket()
    // Fetch History
    const { data: history, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['customer-history', customer?.id],
        queryFn: async () => {
            if (!customer) return []
            return await request('FETCH_CUSTOMER_HISTORY', { customerId: customer.id })
        },
        enabled: !!customer,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 1, // Only retry once on failure
        refetchOnWindowFocus: false // Don't refetch on window focus
    })

    if (!customer) return null

    return (
        <Modal
            isOpen={!!customer}
            onClose={onClose}
            title={`Detalhes: ${customer.name || 'Sem nome'}`}
        >
            <style>{`
                .customer-details-container {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-lg);
                }
                .customer-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-md);
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                }
                .detail-label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-text-secondary);
                }
                .detail-value {
                    font-size: 0.875rem;
                    color: var(--color-text-primary);
                    margin-top: var(--space-xs);
                }
                .metadata-section {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                }
                .metadata-header {
                    font-size: 1rem;
                    font-weight: 500;
                    color: var(--color-text-primary);
                    margin: 0;
                }
                .metadata-list {
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-md);
                    padding: var(--space-md);
                    max-height: 240px;
                    overflow-y: auto;
                    border: 1px solid var(--color-border);
                }
                .metadata-item {
                    display: flex;
                    justify-content: space-between;
                    padding: var(--space-xs) 0;
                    border-bottom: 1px solid var(--color-border);
                }
                .metadata-item:last-child {
                    border-bottom: none;
                }
                .metadata-key {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-text-secondary);
                }
                .metadata-value {
                    font-size: 0.875rem;
                    color: var(--color-text-primary);
                }
                .empty-metadata {
                    color: var(--color-text-muted);
                    font-size: 0.875rem;
                    text-align: center;
                    padding: var(--space-md);
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: var(--space-md);
                    border-top: 1px solid var(--color-border);
                }
            `}</style>

            <div className="customer-details-container">
                {/* Basic Info */}
                <div className="customer-details-grid">
                    <div className="detail-item">
                        <label className="detail-label">ID Externo</label>
                        <div className="detail-value">{customer.externalId}</div>
                    </div>
                    <div className="detail-item">
                        <label className="detail-label">Plataforma</label>
                        <div className="detail-value">
                            {customer.provider === 'tg' ? 'Telegram' : 'Discord'}
                        </div>
                    </div>
                    <div className="detail-item">
                        <label className="detail-label">Username</label>
                        <div className="detail-value">{customer.username || '-'}</div>
                    </div>
                    <div className="detail-item">
                        <label className="detail-label">Última Interação</label>
                        <div className="detail-value">
                            {new Date(customer.lastInteraction).toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>

                {/* Metadata */}
                <div className="metadata-section">
                    <h3 className="metadata-header">Dados Capturados</h3>
                    <div className="metadata-list">
                        {Object.entries(customer.metadata || {}).length === 0 ? (
                            <div className="empty-metadata">Nenhum dado capturado ainda.</div>
                        ) : (
                            Object.entries(customer.metadata).map(([key, value]) => (
                                <div key={key} className="metadata-item">
                                    <span className="metadata-key">{key}:</span>
                                    <span className="metadata-value">{String(value)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* History snapshots */}
                <div className="metadata-section" style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
                    <h3 className="metadata-header">Histórico de Sessões</h3>
                    <div className="metadata-list">
                        {isLoadingHistory ? (
                            <div className="empty-metadata">Carregando histórico...</div>
                        ) : history && history.length > 0 ? (
                            history.map((item: any, idx: number) => (
                                <div key={item.id} style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Fluxo: {item.lastFlowId || 'Geral'}</span>
                                        <span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--space-xs)' }}>
                                        {Object.entries(item.metadata).map(([k, v]) => (
                                            <div key={k} style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <span style={{ color: 'var(--color-text-muted)' }}>{k}: </span>
                                                <span style={{ fontWeight: 500 }}>{String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-metadata">Nenhum histórico disponível.</div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="modal-actions">
                    <Button variant="secondary" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
