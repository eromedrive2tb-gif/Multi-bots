/** @jsxImportSource react */
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates'
import { Button } from '../components/atoms/ui/Button'
import { Spinner } from '../components/atoms/ui/Spinner'
import { Modal } from '../components/molecules/ui/Modal'
import { Input } from '../components/atoms/ui/Input'

interface Campaign {
    id: string; name: string; flowId: string; segment: string;
    status: 'active' | 'paused' | 'draft' | 'completed'; frequency: string;
    startTime?: string;
    totalSent: number; totalFailed: number; revenue: number; createdAt: string;
    botId: string;
}

interface Bot {
    id: string; name: string;
}

type WizardStep = 1 | 2 | 3

const AUDIENCE_SEGMENTS = [
    { value: 'all', label: 'Todos os Leads', icon: '👥', desc: 'Todas as pessoas na base' },
    { value: 'not_purchased', label: 'Não Compraram', icon: '🛒', desc: 'Leads que não finalizaram compra' },
    { value: 'purchased', label: 'Já Compraram', icon: '✅', desc: 'Clientes que já compraram' },
    { value: 'pix_recovery', label: 'PIX Gerado', icon: '💰', desc: 'Geraram PIX mas não pagaram' },
    { value: 'expired', label: 'Expirados', icon: '⏰', desc: 'PIX expirado sem pagamento' },
    { value: 'group_members', label: 'Membros do Grupo', icon: '👨‍👧‍👦', desc: 'Membros de grupos/canais' },
]

export const RemarketingPage: React.FC = () => {
    const queryClient = useQueryClient()
    const [showWizard, setShowWizard] = useState(false)
    const [wizardStep, setWizardStep] = useState<WizardStep>(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [sort, setSort] = useState('newest')

    const [form, setForm] = useState({
        name: '', flowId: '', segment: 'all', botId: '',
        frequency: 'daily', startTime: '09:00', endTime: '18:00',
        immediate: false,
        content: '',
        contentType: 'flow' as 'flow' | 'text'
    })

    const [viewRecipientsId, setViewRecipientsId] = useState<string | null>(null)

    const { data: campaigns, isLoading } = useQuery<Campaign[]>({
        queryKey: ['campaigns'], queryFn: async () => {
            const res = await fetch('/api/broadcasts/campaigns'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data || []
        },
    })

    // WebSocket for Event-based Updates
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/broadcasts/ws`;

        let socket: WebSocket;
        let reconnectTimeout: any;

        const connect = () => {
            console.log('[Remarketing] Connecting to WebSocket...');
            socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'campaign_update') {
                        console.log('[Remarketing] Real-time update received:', data);

                        // IN-PLACE CACHE UPDATE (No HTTP Request)
                        queryClient.setQueryData<Campaign[]>(['campaigns'], (old) => {
                            if (!old) return old;
                            return old.map(c => {
                                if (c.id === data.campaignId) {
                                    return {
                                        ...c,
                                        totalSent: data.totalSent ?? c.totalSent,
                                        totalFailed: data.totalFailed ?? c.totalFailed,
                                        status: data.status ?? c.status
                                    };
                                }
                                return c;
                            });
                        });

                        // Optionally invalidate recipients only if specifically told or for completion
                        if (data.status === 'completed') {
                            queryClient.invalidateQueries({ queryKey: ['recipients', data.campaignId] });
                        }
                    }
                } catch (e) {
                    console.error('[Remarketing] WS parse error:', e);
                }
            };

            socket.onclose = () => {
                console.warn('[Remarketing] WS closed. Reconnecting...');
                reconnectTimeout = setTimeout(connect, 5000);
            };

            socket.onerror = (err) => {
                console.error('[Remarketing] WS error:', err);
                socket.close();
            };
        };

        connect();

        return () => {
            if (socket) socket.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [queryClient]);

    const { data: bots } = useQuery<Bot[]>({
        queryKey: ['bots'], queryFn: async () => {
            const res = await fetch('/api/bots'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data || []
        },
    })

    const createMut = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/broadcasts/campaigns', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    botId: form.botId,
                    segment: form.segment,
                    flowId: form.contentType === 'flow' ? form.flowId : '',
                    frequency: form.frequency,
                    startTime: form.immediate ? undefined : form.startTime,
                    content: { text: form.contentType === 'text' ? form.content : '' },
                }),
            })
            const r = await res.json() as any;
            if (!r.success) throw new Error(r.error)

            const newCampaignId = r.data.id;

            // If immediate execution is requested, activate the campaign immediately
            if (form.immediate && newCampaignId) {
                const actRes = await fetch(`/api/broadcasts/campaigns/${newCampaignId}/activate`, { method: 'POST' })
                const actR = await actRes.json() as any;
                if (!actR.success) console.warn('Failed to auto-activate campaign:', actR.error)
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); setShowWizard(false); setWizardStep(1); setForm(f => ({ ...f, immediate: false })) },
    })

    const toggleMut = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'activate' | 'pause' }) => {
            const res = await fetch(`/api/broadcasts/campaigns/${id}/${action}`, { method: 'POST' })
            const r = await res.json() as any; if (!r.success) throw new Error(r.error)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    })

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/broadcasts/campaigns/${id}/delete`, { method: 'POST' })
            const r = await res.json() as any; if (!r.success) throw new Error(r.error)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    })

    const totalCampaigns = campaigns?.length || 0
    const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0
    const totalMsgSent = campaigns?.reduce((sum, c) => sum + (c.totalSent || 0), 0) || 0
    const totalRevenue = campaigns?.reduce((sum, c) => sum + (c.revenue || 0), 0) || 0

    const filtered = (campaigns || [])
        .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
        .filter(c => statusFilter === 'all' || c.status === statusFilter)
        .sort((a, b) => sort === 'newest'
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )

    const fmt = (v: number) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`

    return (
        <DashboardLayout title="Remarketing" currentPath="/dashboard/remarketing">
            <style>{`
                .rmk-page { display: flex; flex-direction: column; gap: var(--space-xl); }
                .rmk-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .rmk-header h1 { margin: 0; font-size: 1.5rem; }
                .rmk-header p { margin: 4px 0 0; font-size: 0.85rem; color: var(--color-text-muted); }

                .rmk-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); }
                .rmk-stat {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; align-items: center; gap: var(--space-md);
                }
                .rmk-stat-icon {
                    width: 42px; height: 42px; border-radius: 50%; display: flex;
                    align-items: center; justify-content: center; font-size: 1.2rem;
                }
                .rmk-stat-info { display: flex; flex-direction: column; }
                .rmk-stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
                .rmk-stat-value { font-size: 1.5rem; font-weight: 700; }

                .rmk-filters {
                    display: flex; gap: var(--space-md); align-items: center;
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-md);
                }
                .rmk-search { flex: 1; }
                .rmk-search input { width: 100%; }
                .rmk-filter-select {
                    padding: 8px 12px; border-radius: var(--radius-md);
                    background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
                    color: var(--color-text-primary); font-size: 0.8rem; cursor: pointer;
                }

                .rmk-empty {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-2xl);
                    text-align: center; display: flex; flex-direction: column; align-items: center;
                }
                .rmk-empty-dot { width: 12px; height: 12px; border-radius: 50%; background: #10b981; margin-bottom: var(--space-sm); }
                .rmk-empty-icon {
                    width: 64px; height: 64px; border-radius: var(--radius-lg);
                    background: rgba(6,182,212,.15); display: flex; align-items: center;
                    justify-content: center; font-size: 1.8rem; margin-bottom: var(--space-md);
                }

                .rmk-campaign-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .rmk-campaign-info h4 { margin: 0; font-size: 0.95rem; }
                .rmk-campaign-info p { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); }
                .rmk-campaign-meta { display: flex; gap: var(--space-lg); align-items: center; }
                .rmk-meta-item { text-align: center; }
                .rmk-meta-item .val { font-weight: 600; font-size: 0.9rem; }
                .rmk-meta-item .lbl { font-size: 0.7rem; color: var(--color-text-muted); }
                .rmk-campaign-actions { display: flex; gap: var(--space-sm); }

                /* Wizard */
                .rmk-wizard { display: flex; flex-direction: column; gap: var(--space-lg); }
                .rmk-wizard-steps { display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); }
                .rmk-step-indicator {
                    flex: 1; padding: 8px; text-align: center; border-radius: var(--radius-md);
                    font-size: 0.8rem; font-weight: 500; border: 1px solid var(--color-border);
                    background: transparent; color: var(--color-text-muted);
                }
                .rmk-step-indicator.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
                .rmk-step-indicator.done { background: rgba(16,185,129,.15); color: #10b981; border-color: #10b981; }

                .rmk-audience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
                .rmk-audience-option {
                    padding: var(--space-md); border: 2px solid var(--color-border); border-radius: var(--radius-lg);
                    cursor: pointer; transition: all var(--transition-fast); background: transparent;
                    text-align: left; display: flex; align-items: center; gap: var(--space-sm);
                }
                .rmk-audience-option:hover { border-color: var(--color-primary); }
                .rmk-audience-option.active { border-color: var(--color-primary); background: var(--color-primary-light); }
                .rmk-audience-option .icon { font-size: 1.5rem; }
                .rmk-audience-option h5 { margin: 0; font-size: 0.85rem; }
                .rmk-audience-option p { margin: 2px 0 0; font-size: 0.7rem; color: var(--color-text-muted); }

                .rmk-schedule-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); }

                .loading-center { display: flex; justify-content: center; padding: var(--space-2xl); }
            `}</style>

            <div className="rmk-page">
                <div className="rmk-header">
                    <div>
                        <h1>Remarketing</h1>
                        <p>Centro de comando de campanhas</p>
                    </div>
                    <Button onClick={() => { setShowWizard(true); setWizardStep(1) }}>+ Nova Campanha</Button>
                </div>

                {/* Stats - 4 cards */}
                <div className="rmk-stats">
                    <div className="rmk-stat">
                        <div className="rmk-stat-icon" style={{ background: 'rgba(6,182,212,.15)' }}>🎯</div>
                        <div className="rmk-stat-info">
                            <span className="rmk-stat-label">TOTAL CAMPANHAS</span>
                            <span className="rmk-stat-value">{totalCampaigns}</span>
                        </div>
                    </div>
                    <div className="rmk-stat">
                        <div className="rmk-stat-icon" style={{ background: 'rgba(234,179,8,.15)' }}>⚡</div>
                        <div className="rmk-stat-info">
                            <span className="rmk-stat-label">ATIVAS AGORA</span>
                            <span className="rmk-stat-value">{activeCampaigns}</span>
                        </div>
                    </div>
                    <div className="rmk-stat">
                        <div className="rmk-stat-icon" style={{ background: 'rgba(139,92,246,.15)' }}>📨</div>
                        <div className="rmk-stat-info">
                            <span className="rmk-stat-label">MENSAGENS ENVIADAS</span>
                            <span className="rmk-stat-value">{totalMsgSent}</span>
                        </div>
                    </div>
                    <div className="rmk-stat">
                        <div className="rmk-stat-icon" style={{ background: 'rgba(16,185,129,.15)' }}>💰</div>
                        <div className="rmk-stat-info">
                            <span className="rmk-stat-label">RECEITA TOTAL</span>
                            <span className="rmk-stat-value">{fmt(totalRevenue)}</span>
                        </div>
                    </div>
                </div>

                {/* Filters: Search + Status + Sort */}
                <div className="rmk-filters">
                    <div className="rmk-search">
                        <Input name="search" placeholder="🔍 Buscar campanhas..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
                    </div>
                    <select className="rmk-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">Todos Status</option>
                        <option value="active">Ativas</option>
                        <option value="paused">Pausadas</option>
                        <option value="draft">Rascunho</option>
                    </select>
                    <select className="rmk-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="newest">Mais Recentes</option>
                        <option value="oldest">Mais Antigas</option>
                    </select>
                </div>

                {/* Campaign List or Empty State */}
                {isLoading ? <div className="loading-center"><Spinner size="lg" /></div> : (
                    <>
                        {filtered.length === 0 ? (
                            <div className="rmk-empty">
                                <div className="rmk-empty-dot" />
                                <div className="rmk-empty-icon">🎯</div>
                                <strong style={{ fontSize: '1.1rem' }}>Pronto para começar?</strong>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 400, marginTop: 8 }}>
                                    Crie sua primeira campanha de remarketing e comece a recuperar vendas perdidas com mensagens personalizadas.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {filtered.map(c => (
                                    <div key={c.id} className="rmk-campaign-card">
                                        <div className="rmk-campaign-info">
                                            <h4>{c.name}</h4>
                                            <p>{AUDIENCE_SEGMENTS.find(s => s.value === c.segment)?.label || c.segment} • {c.frequency}</p>
                                        </div>
                                        <div className="rmk-campaign-meta">
                                            <div className="rmk-meta-item"><div className="val">{c.totalSent || 0}</div><div className="lbl">Enviadas</div></div>
                                            <div className="rmk-meta-item"><div className="val">{c.totalFailed || 0}</div><div className="lbl">Falhas</div></div>
                                            <div className="rmk-meta-item">
                                                <div className="val" style={{ color: c.status === 'active' ? '#eab308' : c.status === 'completed' ? '#10b981' : 'var(--color-text-muted)' }}>
                                                    {c.status.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rmk-campaign-actions">
                                            <button className="rmk-view-btn" onClick={() => setViewRecipientsId(c.id)}>📊 Relatório</button>
                                            {c.status === 'active' && <Button size="sm" variant="secondary" onClick={() => toggleMut.mutate({ id: c.id, action: 'pause' })}>{toggleMut.isPending ? '...' : 'Pausar'}</Button>}
                                            {c.status === 'paused' && <Button size="sm" variant="secondary" onClick={() => toggleMut.mutate({ id: c.id, action: 'activate' })}>{toggleMut.isPending ? '...' : 'Ativar'}</Button>}
                                            <Button size="sm" variant="danger" onClick={() => { if (confirm('Excluir campanha?')) deleteMut.mutate(c.id) }}>✕</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Wizard Modal - 3 Steps */}
            <Modal isOpen={showWizard} onClose={() => setShowWizard(false)} title="Nova Campanha">
                <div className="rmk-wizard">
                    {/* Step indicators */}
                    <div className="rmk-wizard-steps">
                        <div className={`rmk-step-indicator ${wizardStep === 1 ? 'active' : wizardStep > 1 ? 'done' : ''}`}>1. Definição</div>
                        <div className={`rmk-step-indicator ${wizardStep === 2 ? 'active' : wizardStep > 2 ? 'done' : ''}`}>2. Agendamento</div>
                        <div className={`rmk-step-indicator ${wizardStep === 3 ? 'active' : ''}`}>3. Revisão</div>
                    </div>

                    {/* Step 1: Name + Flow + Audience */}
                    {wizardStep === 1 && (
                        <>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Nome da Campanha</label>
                                <Input name="name" placeholder="Ex: Recuperar carrinhos" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Robo Responsavel</label>
                                <select
                                    className="rmk-filter-select"
                                    style={{ width: '100%' }}
                                    value={form.botId}
                                    onChange={e => setForm(f => ({ ...f, botId: e.target.value }))}
                                >
                                    <option value="">Selecione um Bot...</option>
                                    {bots?.map(bot => (
                                        <option key={bot.id} value={bot.id}>{bot.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                                    <Button
                                        size="sm"
                                        variant={form.contentType === 'flow' ? 'primary' : 'secondary'}
                                        onClick={() => setForm(f => ({ ...f, contentType: 'flow' }))}
                                    >
                                        Blueprint (Fluxo)
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={form.contentType === 'text' ? 'primary' : 'secondary'}
                                        onClick={() => setForm(f => ({ ...f, contentType: 'text' }))}
                                    >
                                        Mensagem Simples
                                    </Button>
                                </div>
                            </div>

                            {form.contentType === 'flow' ? (
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Fluxo (Blueprint ID)</label>
                                    <Input name="flow" placeholder="ID do fluxo (ex: welcome_flow)" value={form.flowId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, flowId: e.target.value }))} />
                                </div>
                            ) : (
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Sua Mensagem</label>
                                    <textarea
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                                            background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)', fontSize: '0.85rem', minHeight: '80px'
                                        }}
                                        placeholder="Olá, temos uma oferta para você..."
                                        value={form.content}
                                        onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                                    />
                                </div>
                            )}
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 10 }}>Público-Alvo</label>
                                <div className="rmk-audience-grid">
                                    {AUDIENCE_SEGMENTS.map(seg => (
                                        <button key={seg.value}
                                            className={`rmk-audience-option ${form.segment === seg.value ? 'active' : ''}`}
                                            onClick={() => setForm(f => ({ ...f, segment: seg.value }))}
                                        >
                                            <span className="icon">{seg.icon}</span>
                                            <div><h5>{seg.label}</h5><p>{seg.desc}</p></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button onClick={() => setWizardStep(2)} disabled={!form.name || !form.botId}>Próximo →</Button>
                            </div>
                        </>
                    )}

                    {/* Step 2: Scheduling */}
                    {wizardStep === 2 && (
                        <>
                            <div className="rmk-schedule-group">
                                <div style={{ gridColumn: '1 / -1', marginBottom: 8 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={form.immediate}
                                            onChange={e => setForm(f => ({ ...f, immediate: e.target.checked }))}
                                        />
                                        <span>🚀 Iniciar envio imediatamente após criar</span>
                                    </label>
                                    <p style={{ margin: '4px 0 0 24px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        O envio começará gradualmente respeitando a estratégia Anti-Ban (Gotejamento).
                                    </p>
                                </div>

                                <div style={{ opacity: form.immediate ? 0.5 : 1, pointerEvents: form.immediate ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Frequência</label>
                                    <select className="rmk-filter-select" style={{ width: '100%' }} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                                        <option value="once">Uma vez</option>
                                        <option value="daily">Diária</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensal</option>
                                    </select>
                                </div>
                                <div style={{ opacity: form.immediate ? 0.5 : 1, pointerEvents: form.immediate ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Horário Início</label>
                                    <Input name="startTime" type="time" value={form.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, startTime: e.target.value }))} />
                                </div>
                                <div style={{ opacity: form.immediate ? 0.5 : 1, pointerEvents: form.immediate ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Horário Fim</label>
                                    <Input name="endTime" type="time" value={form.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, endTime: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Button variant="secondary" onClick={() => setWizardStep(1)}>← Voltar</Button>
                                <Button onClick={() => setWizardStep(3)}>Próximo →</Button>
                            </div>
                        </>
                    )}

                    {/* Step 3: Review */}
                    {wizardStep === 3 && (
                        <>
                            <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                                <h4 style={{ margin: '0 0 var(--space-md)' }}>📋 Resumo da Campanha</h4>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Nome:</span><span style={{ fontWeight: 600 }}>{form.name}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Bot:</span><span style={{ fontWeight: 600 }}>{bots?.find(b => b.id === form.botId)?.name}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Fluxo:</span><span style={{ fontWeight: 600 }}>{form.flowId || '—'}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Público:</span><span style={{ fontWeight: 600 }}>{AUDIENCE_SEGMENTS.find(s => s.value === form.segment)?.label}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Frequência:</span><span style={{ fontWeight: 600 }}>{form.frequency}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Horário:</span><span style={{ fontWeight: 600 }}>{form.startTime} — {form.endTime}</span></div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Button variant="secondary" onClick={() => setWizardStep(2)}>← Voltar</Button>
                                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                                    {createMut.isPending ? 'Criando...' : '✓ Criar Campanha'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Campaign Report Modal */}
            <ReportModal
                campaignId={viewRecipientsId}
                onClose={() => setViewRecipientsId(null)}
            />
        </DashboardLayout>
    )
}

const ReportModal: React.FC<{ campaignId: string | null, onClose: () => void }> = ({ campaignId, onClose }) => {
    const { data: recipients, isLoading } = useQuery<any[]>({
        queryKey: ['recipients', campaignId],
        queryFn: async () => {
            if (!campaignId) return [];
            const res = await fetch(`/api/broadcasts/campaigns/${campaignId}/recipients`);
            const r = await res.json() as any;
            return r.success ? r.data : [];
        },
        enabled: !!campaignId,
    });

    if (!campaignId) return null;

    const stats = {
        total: recipients?.length || 0,
        sent: recipients?.filter(r => r.status === 'sent').length || 0,
        blocked: recipients?.filter(r => r.status === 'blocked').length || 0,
        invalid: recipients?.filter(r => r.status === 'invalid_id').length || 0,
        failed: recipients?.filter(r => r.status === 'failed').length || 0,
        pending: recipients?.filter(r => r.status === 'pending').length || 0,
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'sent': return { bg: 'rgba(16,185,129,.15)', color: '#10b981', label: 'ENVIADO' };
            case 'blocked': return { bg: 'rgba(245,158,11,.15)', color: '#f59e0b', label: 'BLOQUEADO' };
            case 'invalid_id': return { bg: 'rgba(139,92,246,.15)', color: '#8b5cf6', label: 'ID INVÁLIDO' };
            case 'failed': return { bg: 'rgba(239,68,68,.15)', color: '#ef4444', label: 'FALHOU' };
            default: return { bg: 'rgba(107,114,128,.15)', color: 'var(--color-text-muted)', label: 'PENDENTE' };
        }
    };

    return (
        <Modal title="📊 Relatório Detalhado de Campanha" isOpen={!!campaignId} onClose={onClose}>
            <div style={{ minWidth: '500px' }}>
                {/* Stats Summary Bar */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10,
                    marginBottom: 20, padding: 15, background: 'var(--color-bg-tertiary)', borderRadius: 12
                }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.sent}</div><div style={{ fontSize: '0.65rem', color: '#10b981' }}>ENVIADOS</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.blocked}</div><div style={{ fontSize: '0.65rem', color: '#f59e0b' }}>BLOCKED</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.invalid}</div><div style={{ fontSize: '0.65rem', color: '#8b5cf6' }}>INVALID ID</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.failed}</div><div style={{ fontSize: '0.65rem', color: '#ef4444' }}>FALHAS</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.pending}</div><div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>FILA</div></div>
                </div>

                <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {isLoading ? <div className="loading-center"><Spinner /></div> : (
                        !recipients || recipients.length === 0 ? <p style={{ textAlign: 'center', padding: 20 }}>Sem dados para exibir.</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                                        <th style={{ padding: 10 }}>Destinatário</th>
                                        <th style={{ padding: 10 }}>Resultado</th>
                                        <th style={{ padding: 10 }}>Horário</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recipients.map((r) => {
                                        const style = getStatusStyle(r.status);
                                        return (
                                            <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: 10 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.customer_id}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: 10 }}>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700,
                                                        background: style.bg, color: style.color
                                                    }}>
                                                        {style.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 10, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                                    {new Date(r.updated_at || r.created_at).toLocaleTimeString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )
                    )}
                </div>
            </div>
            <div style={{ marginTop: 25, textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total de {stats.total} leads processados</span>
                <Button variant="secondary" onClick={onClose}>Fechar Relatório</Button>
            </div>
        </Modal>
    );
};
