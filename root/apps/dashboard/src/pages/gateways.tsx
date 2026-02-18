/** @jsxImportSource react */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../client/context/SocketContext'
import { DashboardLayout } from '../components/templates'
import { Button } from '../components/atoms/ui/Button'
import { Spinner } from '../components/atoms/ui/Spinner'
import { Modal } from '../components/molecules/ui/Modal'
import { Input } from '../components/atoms/ui/Input'

interface GatewayConfig {
    id: string; provider: string; clientId: string; scope: 'global' | 'specific';
    isActive: boolean; priority: number; createdAt: string
}

type GatewayCategory = 'all' | 'pix' | 'card' | 'crypto'

const GATEWAY_PROVIDERS = [
    { id: 'pushinpay', name: 'PushinPay', type: 'pix' as const, icon: '💸', description: 'Pagamento via PIX' },
    { id: 'mercadopago', name: 'MercadoPago', type: 'pix' as const, icon: '💰', description: 'Pagamento via PIX' },
    { id: 'asaas', name: 'Asaas', type: 'pix' as const, icon: '🏦', description: 'Pagamento via PIX' },
    { id: 'stripe', name: 'Stripe', type: 'card' as const, icon: '💳', description: 'Cartão Internacional' },
    { id: 'syncpay', name: 'SyncPay', type: 'pix' as const, icon: '🔄', description: 'Pagamento via PIX' },
    { id: 'wiinpay', name: 'WiinPay', type: 'pix' as const, icon: '🟢', description: 'Pagamento via PIX' },
    { id: 'crypto', name: 'Crypto Wallet', type: 'crypto' as const, icon: '₿', description: 'Pagamento via Criptomoedas' },
    { id: 'mock', name: 'Gateway de Teste', type: 'pix' as const, icon: '🧪', description: 'Simulação para Testes (30s aprovação)' },
] as const

export const GatewaysPage: React.FC = () => {
    const qc = useQueryClient()
    const { request } = useSocket()
    const [category, setCategory] = useState<GatewayCategory>('all')
    const [configuring, setConfiguring] = useState<string | null>(null)
    const [form, setForm] = useState({ clientId: '', clientSecret: '', scope: 'global' as 'global' | 'specific' })

    const { data: configured, isLoading } = useQuery<GatewayConfig[]>({
        queryKey: ['gateways'],
        queryFn: async () => {
            return await request('FETCH_GATEWAYS')
        },
    })

    const saveMut = useMutation({
        mutationFn: async () => {
            if (!configuring) return
            await request('SAVE_GATEWAY', {
                provider: configuring,
                name: GATEWAY_PROVIDERS.find(g => g.id === configuring)?.name || configuring,
                credentials: {
                    clientId: form.clientId,
                    clientSecret: form.clientSecret,
                },
                isDefault: form.scope === 'global',
            })
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['gateways'] })
            setConfiguring(null)
            setForm({ clientId: '', clientSecret: '', scope: 'global' })
        },
    })

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            await request('DELETE_GATEWAY', { id })
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['gateways'] }),
    })

    const filtered = GATEWAY_PROVIDERS.filter(g => category === 'all' || g.type === category)
    const isConfigured = (providerId: string) => configured?.some(c => c.provider === providerId)
    const getConfig = (providerId: string) => configured?.find(c => c.provider === providerId)

    const categories: { key: GatewayCategory; label: string; icon: string }[] = [
        { key: 'all', label: 'Todos', icon: '' },
        { key: 'pix', label: 'PIX', icon: '🟡' },
        { key: 'card', label: 'Cartão', icon: '💜' },
        { key: 'crypto', label: 'Crypto', icon: '₿' },
    ]

    return (
        <DashboardLayout title="Gateways de Pagamento" currentPath="/dashboard/gateways">
            <style>{`
                .gw-page { display: flex; flex-direction: column; gap: var(--space-xl); }

                .gw-fallback {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; align-items: center; gap: var(--space-md);
                }
                .gw-fallback-icon { font-size: 1.5rem; width: 40px; height: 40px; border-radius: 50%; background: rgba(6,182,212,.15); display: flex; align-items: center; justify-content: center; }
                .gw-fallback-text h3 { margin: 0; font-size: 0.95rem; }
                .gw-fallback-text p { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); }

                .gw-section-title { display: flex; align-items: center; gap: var(--space-sm); font-size: 1rem; font-weight: 600; }
                .gw-section-title span:first-child { font-size: 1.2rem; }

                .gw-tabs { display: flex; gap: var(--space-sm); }
                .gw-tab {
                    padding: 6px 16px; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 500;
                    border: 1px solid var(--color-border); background: transparent; color: var(--color-text-secondary);
                    cursor: pointer; transition: all var(--transition-fast);
                }
                .gw-tab:hover { border-color: var(--color-primary); color: var(--color-primary); }
                .gw-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

                .gw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-md); }

                .gw-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; flex-direction: column; align-items: center; gap: var(--space-sm);
                    position: relative; transition: all var(--transition-fast); cursor: pointer;
                }
                .gw-card:hover { border-color: var(--color-primary); transform: translateY(-2px); }
                .gw-card.configured { border-color: rgba(16,185,129,.4); }

                .gw-card-icon { font-size: 2.5rem; margin-bottom: var(--space-xs); }
                .gw-card-name { font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; }

                .gw-type-badge {
                    display: inline-block; padding: 2px 8px; border-radius: var(--radius-full);
                    font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em;
                }
                .gw-type-pix { background: rgba(234,179,8,.15); color: #eab308; }
                .gw-type-card { background: rgba(139,92,246,.15); color: #8b5cf6; }
                .gw-type-crypto { background: rgba(245,158,11,.15); color: #f59e0b; }

                .gw-card-desc { font-size: 0.75rem; color: var(--color-text-muted); }

                .gw-card-add {
                    position: absolute; top: 10px; right: 10px; font-size: 1.2rem;
                    color: var(--color-text-muted); transition: color var(--transition-fast);
                }
                .gw-card:hover .gw-card-add { color: var(--color-primary); }

                .gw-configured-badge {
                    position: absolute; top: 8px; left: 8px; font-size: 0.65rem;
                    padding: 2px 8px; border-radius: var(--radius-full);
                    background: rgba(16,185,129,.15); color: #10b981; font-weight: 600;
                }

                .gw-config-form { display: flex; flex-direction: column; gap: var(--space-lg); }
                .gw-scope-group { display: flex; gap: var(--space-md); }
                .gw-scope-option {
                    flex: 1; padding: var(--space-md); border: 2px solid var(--color-border);
                    border-radius: var(--radius-lg); text-align: center; cursor: pointer;
                    transition: all var(--transition-fast); background: transparent;
                }
                .gw-scope-option:hover { border-color: var(--color-primary); }
                .gw-scope-option.active { border-color: var(--color-primary); background: var(--color-primary-light); }
                .gw-scope-option h4 { margin: 0; font-size: 0.85rem; }
                .gw-scope-option p { margin: 4px 0 0; font-size: 0.7rem; color: var(--color-text-muted); }

                .loading-center { display: flex; justify-content: center; padding: var(--space-2xl); }
            `}</style>

            <div className="gw-page">
                {/* Fallback Inteligente Banner */}
                <div className="gw-fallback">
                    <div className="gw-fallback-icon">⚡</div>
                    <div className="gw-fallback-text">
                        <h3>Sistema de Fallback Inteligente</h3>
                        <p>Os gateways serão usados na ordem de prioridade. Se o primeiro falhar, o sistema tentará automaticamente o próximo.</p>
                    </div>
                </div>

                {/* Category Tabs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="gw-section-title"><span>🌐</span> Gateways Disponíveis</div>
                    <div className="gw-tabs">
                        {categories.map(cat => (
                            <button
                                key={cat.key}
                                className={`gw-tab ${category === cat.key ? 'active' : ''}`}
                                onClick={() => setCategory(cat.key)}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="loading-center"><Spinner size="lg" /></div>
                ) : (
                    <div className="gw-grid">
                        {filtered.map(gw => {
                            const cfg = getConfig(gw.id)
                            return (
                                <div
                                    key={gw.id}
                                    className={`gw-card ${cfg ? 'configured' : ''}`}
                                    onClick={() => {
                                        setConfiguring(gw.id)
                                        if (cfg) setForm({ clientId: cfg.clientId, clientSecret: '', scope: cfg.scope })
                                        else setForm({ clientId: '', clientSecret: '', scope: 'global' })
                                    }}
                                >
                                    {cfg && <span className="gw-configured-badge">✓ ATIVO</span>}
                                    <span className="gw-card-add">+</span>
                                    <span className="gw-card-icon">{gw.icon}</span>
                                    <span className="gw-card-name">
                                        {gw.name}
                                        <span className={`gw-type-badge gw-type-${gw.type}`}>
                                            {gw.type === 'pix' ? '⚡ PIX' : gw.type === 'card' ? '💳 Cartão' : '₿ Crypto'}
                                        </span>
                                    </span>
                                    <span className="gw-card-desc">{gw.description}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Configuration Modal */}
            <Modal
                isOpen={!!configuring}
                onClose={() => setConfiguring(null)}
                title={`Configurar ${GATEWAY_PROVIDERS.find(g => g.id === configuring)?.name || ''}`}
            >
                <div className="gw-config-form">
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Client ID</label>
                        <Input name="clientId" placeholder="Seu Client ID" value={form.clientId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, clientId: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Client Secret</label>
                        <Input name="clientSecret" type="password" placeholder="Seu Client Secret" value={form.clientSecret} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, clientSecret: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '10px' }}>Escopo</label>
                        <div className="gw-scope-group">
                            <button className={`gw-scope-option ${form.scope === 'global' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, scope: 'global' }))}>
                                <h4>🌐 Global</h4>
                                <p>Usado para todos os fluxos</p>
                            </button>
                            <button className={`gw-scope-option ${form.scope === 'specific' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, scope: 'specific' }))}>
                                <h4>🎯 Específico</h4>
                                <p>Vinculado a bots/fluxos específicos</p>
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {isConfigured(configuring || '') && (
                            <Button variant="secondary" onClick={() => {
                                const cfg = getConfig(configuring || '')
                                if (cfg && confirm('Remover esta integração?')) {
                                    deleteMut.mutate(cfg.id)
                                    setConfiguring(null)
                                }
                            }}>
                                🗑️ Remover
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => setConfiguring(null)}>Cancelar</Button>
                        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || ((!form.clientId || !form.clientSecret) && configuring !== 'mock')}>
                            {saveMut.isPending ? 'Salvando...' : '✓ Salvar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
