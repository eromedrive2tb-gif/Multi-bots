/** @jsxImportSource react */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates'
import { StatCard } from '../components/molecules/general/StatCard'
import { Button } from '../components/atoms/ui/Button'
import { Spinner } from '../components/atoms/ui/Spinner'
import { Modal } from '../components/molecules/ui/Modal'
import { Input } from '../components/atoms/ui/Input'

interface Redirect {
    id: string; slug: string; slugType: string; mode: string; destinationUrl: string;
    destinationType: 'url' | 'bot'; botId?: string; flowId?: string;
    domain: string; cloakerEnabled: boolean; cloakerMethod: 'redirect' | 'safe_page' | 'mirror';
    cloakerSafeUrl: string | null; pixelId?: string;
    utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
    totalClicks: number; blockedCount: number; allowedCount: number;
    isActive: boolean; createdAt: string
}
interface RedirectStats { totalLinks: number; totalClicks: number; withCloaker: number }

type TabKey = 'links' | 'codigos' | 'utm' | 'dominio'
type CreateStep = 'domain' | 'config'

export const RedirecionadoresPage: React.FC = () => {
    const qc = useQueryClient()
    const [tab, setTab] = useState<TabKey>('links')
    const [showCreate, setShowCreate] = useState(false)
    const [createStep, setCreateStep] = useState<CreateStep>('domain')

    const [form, setForm] = useState({
        slugType: 'random' as 'random' | 'custom', slug: '', mode: 'random',
        domain: typeof window !== 'undefined' ? window.location.host : '', isActive: true, cloakerEnabled: false,
        cloakerMethod: 'redirect' as 'redirect' | 'safe_page' | 'mirror', cloakerSafeUrl: '',
        destinationType: 'url' as 'bot' | 'url', destinationUrl: '', flowId: '', botId: '',
        pixelId: '',
    })
    const [utmForm, setUtmForm] = useState({ baseUrl: '', source: '', medium: '', campaign: '', term: '', content: '' })

    const { data: redirects, isLoading } = useQuery<Redirect[]>({
        queryKey: ['redirects'], queryFn: async () => {
            const res = await fetch('/api/redirects'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data
        },
    })
    const { data: stats } = useQuery<RedirectStats>({
        queryKey: ['redirect-stats'], queryFn: async () => {
            const res = await fetch('/api/redirects/stats'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data
        },
    })

    // Fetch Bots for dropdown
    const { data: bots } = useQuery<any[]>({
        queryKey: ['bots'], queryFn: async () => {
            const res = await fetch('/api/bots'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data
        },
    })

    // Query to fetch blueprints for selected bot
    const { data: blueprints, isLoading: isLoadingBlueprints } = useQuery({
        queryKey: ['bot-blueprints', form.botId],
        queryFn: async () => {
            if (!form.botId) return []
            const res = await fetch(`/api/bots/${form.botId}/blueprints`)
            const r = await res.json() as any
            if (!r.success) throw new Error(r.error)
            return r.data || []
        },
        enabled: !!form.botId
    })

    const createMut = useMutation({
        mutationFn: async () => {
            const body: any = {
                slug: form.slugType === 'random' ? crypto.randomUUID().slice(0, 8) : form.slug,
                destinationUrl: form.destinationType === 'url' ? form.destinationUrl : '',
                destinationType: form.destinationType,
                botId: form.botId,
                flowId: form.flowId,
                domain: form.domain,
                cloakerEnabled: form.cloakerEnabled,
                cloakerMethod: form.cloakerMethod,
                cloakerSafeUrl: form.cloakerSafeUrl || undefined,
            }

            if (form.destinationType === 'bot') {
                const selectedBot = bots?.find((b: any) => b.id === form.botId)
                const botUsername = selectedBot?.username || 'bot'
                // Generate Deep Link with trigger
                // If flowId (trigger) starts with /, remove it for the URL param
                const trigger = form.flowId.startsWith('/') ? form.flowId.substring(1) : form.flowId
                body.destinationUrl = `https://t.me/${botUsername}?start=${trigger}`
            }

            const res = await fetch('/api/redirects', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            })
            const r = await res.json() as any; if (!r.success) throw new Error(r.error)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['redirects'] }); qc.invalidateQueries({ queryKey: ['redirect-stats'] })
            setShowCreate(false); setCreateStep('domain')
        },
    })

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/redirects/${id}/delete`, { method: 'POST' })
            const r = await res.json() as any; if (!r.success) throw new Error(r.error)
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['redirects'] }); qc.invalidateQueries({ queryKey: ['redirect-stats'] }) },
    })

    const copyLink = (r: Redirect) => {
        const url = `https://${r.domain}/r/${r.slug}`
        navigator.clipboard.writeText(url).catch(() => alert(url))
    }

    const generateUtmUrl = () => {
        if (!utmForm.baseUrl) return ''
        try {
            const u = new URL(utmForm.baseUrl)
            if (utmForm.source) u.searchParams.set('utm_source', utmForm.source)
            if (utmForm.medium) u.searchParams.set('utm_medium', utmForm.medium)
            if (utmForm.campaign) u.searchParams.set('utm_campaign', utmForm.campaign)
            if (utmForm.term) u.searchParams.set('utm_term', utmForm.term)
            if (utmForm.content) u.searchParams.set('utm_content', utmForm.content)
            return u.toString()
        } catch { return utmForm.baseUrl }
    }

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'links', label: 'Links' },
        { key: 'codigos', label: 'Códigos de Vendas' },
        { key: 'utm', label: 'Gerador UTM' },
        { key: 'dominio', label: '🌐 Domínio Próprio' },
    ]

    return (
        <DashboardLayout title="Redirecionadores" currentPath="/dashboard/redirecionadores">
            <style>{`
                .redir-page { display: flex; flex-direction: column; gap: var(--space-xl); }
                .redir-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .redir-header h1 { margin: 0; font-size: 1.5rem; }
                .redir-header p { margin: 4px 0 0; font-size: 0.85rem; color: var(--color-text-muted); }

                .redir-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
                .redir-stat-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; align-items: center; gap: var(--space-md);
                }
                .redir-stat-icon {
                    width: 42px; height: 42px; border-radius: 50%; display: flex;
                    align-items: center; justify-content: center; font-size: 1.2rem;
                }
                .redir-stat-info { display: flex; flex-direction: column; }
                .redir-stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
                .redir-stat-value { font-size: 1.5rem; font-weight: 700; }

                .redir-tabs { display: flex; gap: var(--space-xs); margin-bottom: var(--space-md); }
                .redir-tab {
                    padding: 8px 16px; border-radius: var(--radius-md); font-size: 0.8rem;
                    font-weight: 500; border: 1px solid var(--color-border); background: transparent;
                    color: var(--color-text-secondary); cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .redir-tab:hover { border-color: var(--color-primary); color: var(--color-primary); }
                .redir-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

                .redir-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: var(--space-md); }
                .redir-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; flex-direction: column; gap: var(--space-md);
                    transition: all var(--transition-fast);
                }
                .redir-card:hover { border-color: var(--color-primary); }

                .redir-card-url {
                    display: flex; align-items: center; gap: var(--space-sm);
                    font-family: monospace; font-size: 0.85rem; color: var(--color-primary);
                }
                .redir-card-shortcode { font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace; }
                .redir-card-badges { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
                .redir-badge {
                    padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 600;
                }
                .redir-badge-random { background: rgba(6,182,212,.15); color: #06b6d4; }
                .redir-badge-custom { background: rgba(139,92,246,.15); color: #8b5cf6; }
                .redir-badge-active { background: rgba(16,185,129,.15); color: #10b981; }
                .redir-badge-inactive { background: rgba(239,68,68,.15); color: #ef4444; }
                .redir-badge-cloaker { background: rgba(234,179,8,.15); color: #eab308; }
                .redir-card-clicks { font-size: 0.8rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px; }

                .redir-cloaker-stats {
                    background: rgba(239,68,68,.08); border-radius: var(--radius-md); padding: 6px 12px;
                    font-size: 0.75rem; display: flex; gap: var(--space-md);
                }
                .redir-cloaker-stats .blocked { color: #ef4444; }
                .redir-cloaker-stats .allowed { color: #10b981; }

                .redir-card-actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; }

                /* Create Modal */
                .redir-create { display: flex; flex-direction: column; gap: var(--space-lg); }
                .redir-domain-options { display: flex; flex-direction: column; gap: var(--space-md); }
                .redir-domain-option {
                    padding: var(--space-lg); border: 2px solid var(--color-border);
                    border-radius: var(--radius-lg); cursor: pointer;
                    display: flex; align-items: center; gap: var(--space-md);
                    transition: all var(--transition-fast);
                }
                .redir-domain-option:hover { border-color: var(--color-primary); }
                .redir-domain-option h4 { margin: 0; font-size: 0.9rem; }
                .redir-domain-option p { margin: 2px 0 0; font-size: 0.75rem; color: var(--color-text-muted); }

                .redir-slug-type { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); margin-bottom: var(--space-md); }
                .redir-slug-btn {
                    padding: 10px; text-align: center; border: 2px solid var(--color-border);
                    border-radius: var(--radius-md); cursor: pointer; font-size: 0.8rem;
                    background: transparent; color: var(--color-text-secondary);
                    transition: all var(--transition-fast);
                }
                .redir-slug-btn.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); }
                .redir-slug-row { display: flex; gap: var(--space-sm); align-items: center; }
                .redir-toggles { display: flex; gap: var(--space-xl); align-items: center; }
                .redir-toggle-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
                .redir-dest-select {
                    width: 100%; padding: 10px 12px; border-radius: var(--radius-md);
                    background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
                    color: var(--color-text-primary); font-size: 0.85rem;
                }
                .redir-cloaker-methods { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-sm); }
                .redir-cloaker-method {
                    padding: var(--space-md); text-align: center; border: 2px solid var(--color-border);
                    border-radius: var(--radius-md); cursor: pointer; font-size: 0.75rem;
                    background: transparent; transition: all var(--transition-fast);
                }
                .redir-cloaker-method:hover { border-color: var(--color-primary); }
                .redir-cloaker-method.active { border-color: var(--color-primary); background: var(--color-primary-light); }
                .redir-cloaker-method h5 { margin: 0 0 4px; font-size: 0.8rem; }

                /* UTM tab */
                .utm-builder { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-xl); }
                .utm-fields { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-top: var(--space-md); }
                .utm-result {
                    margin-top: var(--space-lg); padding: var(--space-md); background: var(--color-bg-tertiary);
                    border-radius: var(--radius-md); font-family: monospace; font-size: 0.8rem;
                    word-break: break-all; color: var(--color-primary);
                }

                /* Domain tab */
                .domain-setup { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-xl); }
                .domain-steps { display: flex; flex-direction: column; gap: var(--space-lg); margin-top: var(--space-lg); }
                .domain-step { display: flex; gap: var(--space-md); }
                .domain-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
                .domain-step-content h4 { margin: 0; font-size: 0.9rem; }
                .domain-step-content p { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); }
                .domain-cname { margin-top: 8px; padding: 8px 12px; background: var(--color-bg-tertiary); border-radius: var(--radius-md); font-family: monospace; font-size: 0.8rem; }

                .section-title { display: flex; align-items: center; gap: var(--space-sm); font-size: 1rem; font-weight: 600; margin-bottom: var(--space-md); }
                .loading-center { display: flex; justify-content: center; padding: var(--space-2xl); }
            `}</style>

            <div className="redir-page">
                <div className="redir-header">
                    <div>
                        <h1>Redirecionadores</h1>
                        <p>Configure seus links de redirecionamento</p>
                    </div>
                    <Button onClick={() => { setShowCreate(true); setCreateStep('domain') }}>➕ Criar Link</Button>
                </div>

                {/* Stats */}
                <div className="redir-stats">
                    <div className="redir-stat-card">
                        <div className="redir-stat-icon" style={{ background: 'rgba(6,182,212,.15)' }}>🔗</div>
                        <div className="redir-stat-info">
                            <span className="redir-stat-label">TOTAL LINKS</span>
                            <span className="redir-stat-value">{stats?.totalLinks || 0}</span>
                        </div>
                    </div>
                    <div className="redir-stat-card">
                        <div className="redir-stat-icon" style={{ background: 'rgba(139,92,246,.15)' }}>👆</div>
                        <div className="redir-stat-info">
                            <span className="redir-stat-label">TOTAL CLIQUES</span>
                            <span className="redir-stat-value">{stats?.totalClicks || 0}</span>
                        </div>
                    </div>
                    <div className="redir-stat-card">
                        <div className="redir-stat-icon" style={{ background: 'rgba(234,179,8,.15)' }}>⚡</div>
                        <div className="redir-stat-info">
                            <span className="redir-stat-label">COM CLOAKER</span>
                            <span className="redir-stat-value">{stats?.withCloaker || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="redir-tabs">
                    {tabs.map(t => (
                        <button key={t.key} className={`redir-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* TAB: Links */}
                {tab === 'links' && (
                    <>
                        <div className="section-title">🔗 Meus Redirecionadores ({redirects?.length || 0})</div>
                        {isLoading ? <div className="loading-center"><Spinner size="lg" /></div> : (
                            <div className="redir-cards">
                                {(!redirects || redirects.length === 0) ? (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                        Nenhum link criado. Clique em "Criar Link" para começar.
                                    </div>
                                ) : redirects.map(r => (
                                    <div key={r.id} className="redir-card">
                                        <div className="redir-card-url">
                                            🔗 https://{r.domain}/r/{r.slug}
                                            {r.cloakerEnabled && <span className="redir-badge redir-badge-cloaker">◉ V2</span>}
                                        </div>
                                        <div className="redir-card-shortcode">
                                            shk={r.id.slice(0, 8)} <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => navigator.clipboard.writeText(r.id.slice(0, 8))}>📋</button>
                                        </div>
                                        <div className="redir-card-badges">
                                            <span className={`redir-badge ${r.slugType === 'random' ? 'redir-badge-random' : 'redir-badge-custom'}`}>
                                                {r.slugType === 'random' ? 'Aleatório' : 'Personalizado'}
                                            </span>
                                            <span className="redir-badge" style={{ background: 'rgba(59,130,246,.15)', color: '#3b82f6' }}>
                                                {r.destinationType === 'bot' ? '🤖 Bot' : '🌐 URL'}
                                            </span>
                                            <span className={`redir-badge ${r.isActive ? 'redir-badge-active' : 'redir-badge-inactive'}`}>
                                                {r.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                            <span className="redir-card-clicks">⚡ {r.totalClicks} cliques</span>
                                        </div>
                                        {r.cloakerEnabled && (
                                            <div className="redir-cloaker-stats">
                                                <span className="blocked">⊘ {r.blockedCount || 0} bloqueados</span>
                                                <span className="allowed">✓ {r.allowedCount || 0} permitidos</span>
                                            </div>
                                        )}
                                        <div className="redir-card-actions">
                                            <Button size="sm" variant="secondary" onClick={() => { /* TODO: edit */ }}>✏️ Editar</Button>
                                            <Button size="sm" variant="secondary" onClick={() => { if (confirm('Excluir?')) deleteMut.mutate(r.id) }}>🗑️</Button>
                                            <Button size="sm" variant="secondary" onClick={() => copyLink(r)}>📋</Button>
                                            <Button size="sm" variant="secondary" onClick={() => window.open(`https://${r.domain}/r/${r.slug}`, '_blank')}>🔗</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* TAB: Códigos de Vendas */}
                {tab === 'codigos' && (
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>🏷️</div>
                        <h3 style={{ margin: 0 }}>Códigos de Vendas</h3>
                        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Gerencie seus códigos de rastreamento de vendas aqui.</p>
                    </div>
                )}

                {/* TAB: Gerador UTM */}
                {tab === 'utm' && (
                    <div className="utm-builder">
                        <h3 style={{ margin: 0 }}>🔧 Gerador de UTM</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Crie URLs com parâmetros UTM para rastrear suas campanhas</p>
                        <div style={{ marginTop: 'var(--space-md)' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>URL Base</label>
                            <Input name="baseUrl" placeholder="https://seusite.com" value={utmForm.baseUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, baseUrl: e.target.value }))} />
                        </div>
                        <div className="utm-fields">
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_source *</label>
                                <Input name="source" placeholder="google, facebook, telegram" value={utmForm.source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, source: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_medium *</label>
                                <Input name="medium" placeholder="cpc, email, social" value={utmForm.medium} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, medium: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_campaign</label>
                                <Input name="campaign" placeholder="black_friday_2024" value={utmForm.campaign} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, campaign: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_term</label>
                                <Input name="term" placeholder="bot+telegram" value={utmForm.term} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, term: e.target.value }))} />
                            </div>
                        </div>
                        {generateUtmUrl() && (
                            <div className="utm-result">
                                {generateUtmUrl()}
                                <div style={{ marginLeft: 8, display: 'inline-block' }}>
                                    <Button size="sm" onClick={() => navigator.clipboard.writeText(generateUtmUrl())}>📋 Copiar</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: Domínio Próprio */}
                {tab === 'dominio' && (
                    <div className="domain-setup">
                        <h3 style={{ margin: 0 }}>🌐 Domínio Próprio</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Configure seu domínio personalizado para links de redirecionamento</p>
                        <div className="domain-steps">
                            <div className="domain-step">
                                <div className="domain-step-num">1</div>
                                <div className="domain-step-content">
                                    <h4>Registre seu domínio</h4>
                                    <p>Adquira um domínio em um registrador como Hostgator, GoDaddy, ou Namecheap.</p>
                                </div>
                            </div>
                            <div className="domain-step">
                                <div className="domain-step-num">2</div>
                                <div className="domain-step-content">
                                    <h4>Configure o CNAME</h4>
                                    <p>No painel DNS do seu domínio, adicione o seguinte registro CNAME:</p>
                                    <div className="domain-cname">
                                        <strong>Tipo:</strong> CNAME &nbsp; <strong>Nome:</strong> @ &nbsp; <strong>Valor:</strong> proxy.multibots.app
                                    </div>
                                </div>
                            </div>
                            <div className="domain-step">
                                <div className="domain-step-num">3</div>
                                <div className="domain-step-content">
                                    <h4>Adicione seu domínio</h4>
                                    <p>Insira seu domínio abaixo para vinculá-lo à plataforma.</p>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <Input name="domain" placeholder="meudominio.com" />
                                        <Button>Adicionar</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Criar Redirecionador">
                <div className="redir-create">
                    {createStep === 'domain' ? (
                        <>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                🌐 Escolha o Domínio — Selecione o domínio que aparecerá na URL do link
                            </p>
                            <div className="redir-domain-options">
                                <div className="redir-domain-option" onClick={() => { setForm(f => ({ ...f, domain: window.location.host })); setCreateStep('config') }}>
                                    <span style={{ fontSize: '1.5rem' }}>🌐</span>
                                    <div><h4>{window.location.host}</h4><p>Domínio atual</p></div>
                                </div>
                            </div>
                            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
                        </>
                    ) : (
                        <>
                            {/* Slug Type */}
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 6, display: 'block' }}>TIPO DE SLUG</label>
                                <div className="redir-slug-type">
                                    <button className={`redir-slug-btn ${form.slugType === 'random' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, slugType: 'random' }))}>🔀 Aleatório</button>
                                    <button className={`redir-slug-btn ${form.slugType === 'custom' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, slugType: 'custom' }))}>✏️ Personalizado</button>
                                </div>
                            </div>

                            {/* Slug + Mode */}
                            <div className="redir-slug-row">
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>SLUG</label>
                                    <Input name="slug" placeholder={form.slugType === 'random' ? crypto.randomUUID().slice(0, 8) : 'meu-link'} value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, slug: e.target.value }))} disabled={form.slugType === 'random'} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MODO</label>
                                    <select className="redir-dest-select" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                                        <option value="random">Aleatório</option>
                                        <option value="sequential">Sequencial</option>
                                        <option value="single">Única vez</option>
                                    </select>
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="redir-toggles">
                                <label className="redir-toggle-item">
                                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /> Ativo
                                </label>
                                <label className="redir-toggle-item">
                                    <input type="checkbox" checked={form.cloakerEnabled} onChange={e => setForm(f => ({ ...f, cloakerEnabled: e.target.checked }))} /> Cloaker
                                </label>
                            </div>

                            {/* Domain */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                                🌐 {form.domain} <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setCreateStep('domain')}>Alterar</button>
                            </div>

                            {/* Destination */}
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>DESTINO</label>
                                <select className="redir-dest-select" value={form.destinationType} onChange={e => setForm(f => ({ ...f, destinationType: e.target.value as any }))}>
                                    <option value="bot">⚡ Telegram (Bot)</option>
                                    <option value="url">🌐 Landing Page (URL)</option>
                                </select>
                            </div>

                            {form.destinationType === 'url' ? (
                                <Input name="dest" placeholder="https://..." value={form.destinationUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, destinationUrl: e.target.value }))} />
                            ) : (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <select className="redir-dest-select" value={form.botId} onChange={e => setForm(f => ({ ...f, botId: e.target.value }))}>
                                            <option value="">Selecione o Bot</option>
                                            {bots?.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>TRIGGER / FLUXO</label>
                                        {isLoadingBlueprints ? (
                                            <div className="text-sm text-slate-500">Carregando fluxos...</div>
                                        ) : (
                                            <select
                                                className="redir-dest-select"
                                                value={form.flowId}
                                                onChange={e => setForm({ ...form, flowId: e.target.value })}
                                            >
                                                <option value="">Selecione um fluxo...</option>
                                                {blueprints?.map((bp: any) => (
                                                    <option key={bp.id} value={bp.trigger}>
                                                        {bp.name} ({bp.trigger})
                                                    </option>
                                                ))}
                                                {/* Fallback for manual entry or if no blueprints */}
                                                <option value="start">Início (/start)</option>
                                            </select>
                                        )}
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                            Fluxo iniciado ao clicar no link
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Cloaker V2 */}
                            {form.cloakerEnabled && (
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>MÉTODO DE BLOQUEIO</label>
                                    <div className="redir-cloaker-methods">
                                        <button className={`redir-cloaker-method ${form.cloakerMethod === 'safe_page' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, cloakerMethod: 'safe_page' }))}>
                                            <h5>🛡️ Página Segura</h5>
                                            <span>Exibe página de segurança</span>
                                        </button>
                                        <button className={`redir-cloaker-method ${form.cloakerMethod === 'redirect' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, cloakerMethod: 'redirect' }))}>
                                            <h5>↩️ Redirect</h5>
                                            <span>Redireciona para URL segura</span>
                                        </button>
                                        <button className={`redir-cloaker-method ${form.cloakerMethod === 'mirror' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, cloakerMethod: 'mirror' }))}>
                                            <h5>🪞 Espelho</h5>
                                            <span>Clona outra página</span>
                                        </button>
                                    </div>
                                    {(form.cloakerMethod === 'redirect' || form.cloakerMethod === 'mirror') && (
                                        <div style={{ marginTop: 'var(--space-md)' }}>
                                            <Input name="safeUrl" placeholder={form.cloakerMethod === 'redirect' ? 'URL de redirecionamento seguro' : 'URL do site para espelhar'} value={form.cloakerSafeUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, cloakerSafeUrl: e.target.value }))} />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
                                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                                    {createMut.isPending ? 'Criando...' : '✓ Criar'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </DashboardLayout>
    )
}
