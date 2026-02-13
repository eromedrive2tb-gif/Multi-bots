/** @jsxImportSource react */
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/templates'
import { Input } from '../../components/atoms/ui/Input'
import { Button } from '../../components/atoms/ui/Button'
import { CustomerDetailsModal } from '../../components/organisms/customers/CustomerDetailsModal'
import { Spinner } from '../../components/atoms/ui/Spinner'
import { Modal } from '../../components/molecules/ui/Modal'
import type { Customer } from '../../../../engine/src/core/types'

export const CustomersPage: React.FC = () => {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const limit = 20
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [isClearing, setIsClearing] = useState(false)
    const [showConfirmClear, setShowConfirmClear] = useState(false)

    const handleClearAll = async () => {
        setIsClearing(true)
        try {
            const response = await fetch('/api/customers', { method: 'DELETE' })
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
            setShowConfirmClear(false)
            refetch()
        } catch (err) {
            alert('Erro ao limpar dados: ' + (err as Error).message)
        } finally {
            setIsClearing(false)
        }
    }

    // Fetch Customers
    const { data, isLoading, error, refetch } = useQuery<{ data: Customer[], total: number }>({
        queryKey: ['customers', page, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(page * limit)
            })
            if (search) params.append('search', search)

            const response = await fetch(`/api/customers?${params.toString()}`)
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        placeholderData: (previousData) => previousData
    })

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(0)
        refetch()
    }

    const totalPages = data ? Math.ceil(data.total / limit) : 0

    return (
        <DashboardLayout title="Audiência & CRM" currentPath="/dashboard/customers">
            <style>{`
                .customers-page {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-xl);
                }
                .customers-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--color-bg-card);
                    padding: var(--space-md);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    flex-wrap: wrap;
                    gap: var(--space-md);
                    border: 1px solid var(--color-border);
                }
                .search-form {
                    flex: 1;
                    display: flex;
                    gap: var(--space-sm);
                    min-width: 300px;
                }
                .customers-table-container {
                    background: var(--color-bg-card);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                    border: 1px solid var(--color-border);
                }
                .customer-info {
                    display: flex;
                    flex-direction: column;
                }
                .customer-name {
                    font-weight: 500;
                    color: var(--color-text-primary);
                }
                .customer-username {
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                }
                .pagination-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-md);
                    border-top: 1px solid var(--color-border);
                }
                .pagination-actions {
                    display: flex;
                    gap: var(--space-sm);
                }
                .error-state {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--color-danger);
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .loading-state {
                    display: flex;
                    justify-content: center;
                    padding: var(--space-2xl);
                }
            `}</style>

            <div className="customers-page">
                {/* Header Controls */}
                <div className="customers-controls">
                    <form onSubmit={handleSearch} className="search-form">
                        <div style={{ flex: 1 }}>
                            <Input
                                name="search"
                                placeholder="Buscar por nome, username..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit">Buscar</Button>
                    </form>

                    <div className="text-muted flex items-center gap-4">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="btn-clear-metrics"
                            onClick={() => setShowConfirmClear(true)}
                        >
                            Limpar Tudo
                        </Button>
                        Total: <strong>{data?.total || 0}</strong> clientes
                    </div>
                </div>

                {/* Confirm Clear Modal */}
                <Modal
                    isOpen={showConfirmClear}
                    onClose={() => setShowConfirmClear(false)}
                    title="Limpar Audiência"
                >
                    <div className="space-y-4">
                        <p className="text-muted">
                            Isso irá remover permanentemente todos os clientes e dados capturados deste tenant.
                            <strong> Esta ação não pode ser desfeita.</strong>
                        </p>
                        <div className="flex justify-end gap-2 p-t-4" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                            <Button variant="secondary" onClick={() => setShowConfirmClear(false)}>Cancelar</Button>
                            <Button
                                className="btn-clear-metrics"
                                onClick={handleClearAll}
                                disabled={isClearing}
                            >
                                {isClearing ? 'Limpando...' : 'Confirmar Limpeza'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Error State */}
                {error && (
                    <div className="error-state">
                        Erro ao carregar clientes: {(error as Error).message}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !data && (
                    <div className="loading-state">
                        <Spinner size="lg" />
                    </div>
                )}

                {/* Data Table */}
                {data && (
                    <div className="customers-table-container">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="metrics-table">
                                <thead>
                                    <tr>
                                        <th>Nome / Username</th>
                                        <th>Plataforma</th>
                                        <th>Última Interação</th>
                                        <th>Dados</th>
                                        <th style={{ textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                                Nenhum cliente encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.data.map((customer) => (
                                            <tr key={customer.id}>
                                                <td>
                                                    <div className="customer-info">
                                                        <span className="customer-name">
                                                            {customer.name || 'Sem nome'}
                                                        </span>
                                                        {customer.username && (
                                                            <span className="customer-username">@{customer.username}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${customer.provider === 'tg'
                                                        ? 'provider-badge provider-telegram'
                                                        : 'provider-badge provider-discord'
                                                        }`}>
                                                        {customer.provider === 'tg' ? 'Telegram' : 'Discord'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {new Date(customer.lastInteraction).toLocaleDateString('pt-BR', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td>
                                                    {Object.keys(customer.metadata || {}).length} variáveis
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setSelectedCustomer(customer)}
                                                        className="link"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                                                    >
                                                        Detalhes
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="pagination-controls">
                            <div className="pagination-info">
                                <p className="text-muted">
                                    Página <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{page + 1}</span> de <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{Math.max(1, totalPages)}</span>
                                </p>
                            </div>
                            <div className="pagination-actions">
                                <Button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Anterior
                                </Button>
                                <Button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <CustomerDetailsModal
                customer={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
            />
        </DashboardLayout>
    )
}
