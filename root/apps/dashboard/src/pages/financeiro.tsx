/** @jsxImportSource react */
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates'
import { Spinner } from '../components/atoms/ui/Spinner'

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'total'

interface FinancialSummary {
    totalRevenue: number; totalTransactions: number; pendingAmount: number;
    pixGenerated: number; pixPaid: number; pixPending: number;
    pixGeneratedAmount: number; pixPaidAmount: number; pixPendingAmount: number;
    averageTicket: number; approvalRate: number; refunds: number;
}

interface Transaction {
    id: string; customerId: string; customerName: string; planName: string;
    amount: number; gateway: string; status: string; createdAt: string
}

export const FinanceiroPage: React.FC = () => {
    const [period, setPeriod] = useState<Period>('month')
    const [gatewayFilter, setGatewayFilter] = useState('all')

    const periods: { key: Period; label: string }[] = [
        { key: 'today', label: 'Hoje' },
        { key: 'yesterday', label: 'Ontem' },
        { key: 'week', label: 'Semana' },
        { key: 'month', label: 'Mês' },
        { key: 'total', label: 'Todo Período' },
    ]

    const { data: summary, isLoading: loadingSummary } = useQuery<FinancialSummary>({
        queryKey: ['financial-summary', period],
        queryFn: async () => {
            const res = await fetch(`/api/payments/summary?period=${period}`)
            const result = await res.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data
        },
    })

    const { data: transactions, isLoading: loadingTx } = useQuery<Transaction[]>({
        queryKey: ['transactions', period, gatewayFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ period })
            if (gatewayFilter !== 'all') params.set('gateway', gatewayFilter)
            const res = await fetch(`/api/payments/transactions?${params}`)
            const result = await res.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data || []
        },
    })

    const fmt = (v: number) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`

    return (
        <DashboardLayout title="Financeiro" currentPath="/dashboard/financeiro">
            <style>{`
                .fin-page { display: flex; flex-direction: column; gap: var(--space-xl); }
                .fin-header { display: flex; flex-direction: column; gap: var(--space-xs); }
                .fin-header h1 { margin: 0; font-size: 1.5rem; }
                .fin-header p { margin: 0; font-size: 0.85rem; color: var(--color-text-muted); }

                .fin-period-tabs {
                    display: flex; gap: var(--space-xs); padding: 4px;
                    background: var(--color-bg-card); border-radius: var(--radius-lg);
                    border: 1px solid var(--color-border); width: fit-content;
                }
                .fin-period-tab {
                    padding: 8px 16px; border-radius: var(--radius-md); font-size: 0.8rem;
                    font-weight: 500; border: none; background: transparent;
                    color: var(--color-text-secondary); cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .fin-period-tab:hover { color: var(--color-text-primary); }
                .fin-period-tab.active { background: var(--color-bg-tertiary); color: var(--color-text-primary); }

                .fin-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
                .fin-stat-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; align-items: center; gap: var(--space-md);
                }
                .fin-stat-icon {
                    width: 42px; height: 42px; border-radius: var(--radius-md);
                    display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
                }
                .fin-stat-icon.pix-gen { background: rgba(234,179,8,.15); }
                .fin-stat-icon.pix-paid { background: rgba(16,185,129,.15); }
                .fin-stat-icon.pix-pend { background: rgba(6,182,212,.15); }
                .fin-stat-info { display: flex; flex-direction: column; }
                .fin-stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
                .fin-stat-value { font-size: 1.5rem; font-weight: 700; }
                .fin-stat-amount { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px; }
                .fin-stat-amount.green { color: #10b981; }

                .fin-body { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-lg); }

                .fin-transactions {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                }
                .fin-tx-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg); }
                .fin-tx-header h3 { margin: 0; font-size: 1rem; }
                .fin-tx-filters { display: flex; gap: var(--space-sm); align-items: center; }
                .fin-gateway-select {
                    padding: 6px 12px; border-radius: var(--radius-md); font-size: 0.8rem;
                    background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
                    color: var(--color-text-primary); cursor: pointer;
                }
                .fin-filter-btn {
                    width: 32px; height: 32px; border-radius: var(--radius-md);
                    background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    color: var(--color-text-muted);
                }
                .fin-empty-tx {
                    display: flex; flex-direction: column; align-items: center;
                    padding: var(--space-2xl); color: var(--color-text-muted);
                }
                .fin-empty-tx .icon { font-size: 3rem; margin-bottom: var(--space-md); opacity: .5; }

                .fin-sidebar { display: flex; flex-direction: column; gap: var(--space-lg); }
                .fin-sidebar-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                }
                .fin-sidebar-card h3 {
                    margin: 0 0 var(--space-md); font-size: 0.9rem;
                    display: flex; align-items: center; gap: var(--space-sm);
                }
                .fin-sidebar-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: var(--space-sm) 0;
                    border-bottom: 1px solid var(--color-border);
                }
                .fin-sidebar-row:last-child { border-bottom: none; }
                .fin-sidebar-label { font-size: 0.85rem; color: var(--color-text-muted); }
                .fin-sidebar-value { font-size: 0.85rem; font-weight: 600; }

                .loading-center { display: flex; justify-content: center; padding: var(--space-2xl); }
            `}</style>

            <div className="fin-page">
                <div className="fin-header">
                    <h1>Financeiro</h1>
                    <p>Gerencie suas receitas e transações</p>
                </div>

                {/* Period Tabs */}
                <div className="fin-period-tabs">
                    {periods.map(p => (
                        <button key={p.key} className={`fin-period-tab ${period === p.key ? 'active' : ''}`} onClick={() => setPeriod(p.key)}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {loadingSummary ? (
                    <div className="loading-center"><Spinner size="lg" /></div>
                ) : (
                    <>
                        {/* Stats Cards - PIX Gerados / PIX Pagos / Pendentes */}
                        <div className="fin-stats">
                            <div className="fin-stat-card">
                                <div className="fin-stat-icon pix-gen">💳</div>
                                <div className="fin-stat-info">
                                    <span className="fin-stat-label">PIX GERADOS</span>
                                    <span className="fin-stat-value">{summary?.pixGenerated || 0}</span>
                                    <span className="fin-stat-amount">{fmt(summary?.pixGeneratedAmount || 0)}</span>
                                </div>
                            </div>
                            <div className="fin-stat-card">
                                <div className="fin-stat-icon pix-paid">✅</div>
                                <div className="fin-stat-info">
                                    <span className="fin-stat-label">PIX PAGOS</span>
                                    <span className="fin-stat-value">{summary?.pixPaid || 0}</span>
                                    <span className="fin-stat-amount green">↗ {fmt(summary?.pixPaidAmount || 0)}</span>
                                </div>
                            </div>
                            <div className="fin-stat-card">
                                <div className="fin-stat-icon pix-pend">⏳</div>
                                <div className="fin-stat-info">
                                    <span className="fin-stat-label">PENDENTES</span>
                                    <span className="fin-stat-value">{summary?.pixPending || 0}</span>
                                    <span className="fin-stat-amount">{fmt(summary?.pixPendingAmount || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Body: Transactions + Sidebar */}
                        <div className="fin-body">
                            <div className="fin-transactions">
                                <div className="fin-tx-header">
                                    <h3>Transações Recentes</h3>
                                    <div className="fin-tx-filters">
                                        <select className="fin-gateway-select" value={gatewayFilter} onChange={e => setGatewayFilter(e.target.value)}>
                                            <option value="all">Todos Gateway</option>
                                            <option value="pushinpay">PushinPay</option>
                                            <option value="mercadopago">MercadoPago</option>
                                            <option value="asaas">Asaas</option>
                                            <option value="stripe">Stripe</option>
                                        </select>
                                        <button className="fin-filter-btn">🔽</button>
                                    </div>
                                </div>

                                {loadingTx ? (
                                    <div className="loading-center"><Spinner size="md" /></div>
                                ) : !transactions?.length ? (
                                    <div className="fin-empty-tx">
                                        <div className="icon">💲</div>
                                        <strong>Nenhuma transação encontrada</strong>
                                        <p style={{ fontSize: '0.8rem', marginTop: 4 }}>As transações do período selecionado aparecerão aqui</p>
                                    </div>
                                ) : (
                                    <table className="metrics-table">
                                        <thead>
                                            <tr><th>Cliente</th><th>Plano</th><th>Valor</th><th>Gateway</th><th>Status</th><th>Data</th></tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => (
                                                <tr key={tx.id}>
                                                    <td>{tx.customerName || tx.customerId}</td>
                                                    <td>{tx.planName}</td>
                                                    <td style={{ fontWeight: 600 }}>{fmt(tx.amount)}</td>
                                                    <td style={{ fontSize: '0.8rem' }}>{tx.gateway}</td>
                                                    <td><span className={`badge badge-${tx.status === 'confirmed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}`}>{tx.status}</span></td>
                                                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(tx.createdAt).toLocaleDateString('pt-BR')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Right Sidebar */}
                            <div className="fin-sidebar">
                                <div className="fin-sidebar-card">
                                    <h3>💳 Métodos de Pagamento</h3>
                                    <div className="fin-sidebar-row">
                                        <span className="fin-sidebar-label">PIX</span>
                                        <span className="fin-sidebar-value">{fmt(summary?.pixPaidAmount || 0)}</span>
                                    </div>
                                </div>

                                <div className="fin-sidebar-card">
                                    <h3>📈 Resumo do Período</h3>
                                    <div className="fin-sidebar-row">
                                        <span className="fin-sidebar-label">Total de Vendas</span>
                                        <span className="fin-sidebar-value">{summary?.totalTransactions || 0}</span>
                                    </div>
                                    <div className="fin-sidebar-row">
                                        <span className="fin-sidebar-label">Ticket Médio</span>
                                        <span className="fin-sidebar-value">{fmt(summary?.averageTicket || 0)}</span>
                                    </div>
                                    <div className="fin-sidebar-row">
                                        <span className="fin-sidebar-label">Taxa de Aprovação</span>
                                        <span className="fin-sidebar-value">{(summary?.approvalRate || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="fin-sidebar-row">
                                        <span className="fin-sidebar-label">Reembolsos</span>
                                        <span className="fin-sidebar-value">{summary?.refunds || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}
