/** @jsxImportSource react */
import React, { useState, useEffect } from 'react'
import { Modal } from '../../molecules/ui/Modal'
import { Button } from '../../atoms/ui/Button'
import { Input } from '../../atoms/ui/Input'
import { RedirectFormState, CreateStep } from '../../../client/hooks/useRedirectsUI'

interface CreateRedirectModalProps {
    isOpen: boolean
    onClose: () => void
    form: RedirectFormState
    updateForm: (updates: Partial<RedirectFormState>) => void
    step: CreateStep
    setStep: (step: CreateStep) => void
    bots: any[]
    fetchBlueprints: (botId: string) => Promise<any[]>
    onSubmit: () => void
    isSubmitting: boolean
}

export const CreateRedirectModal: React.FC<CreateRedirectModalProps> = ({
    isOpen, onClose, form, updateForm, step, setStep, bots, fetchBlueprints, onSubmit, isSubmitting
}) => {
    const [blueprints, setBlueprints] = useState<any[]>([])
    const [isLoadingBlueprints, setIsLoadingBlueprints] = useState(false)

    // Effect to fetch blueprints when botId changes
    useEffect(() => {
        if (form.destinationType === 'bot' && form.botId) {
            setIsLoadingBlueprints(true)
            fetchBlueprints(form.botId)
                .then(setBlueprints)
                .catch(() => setBlueprints([]))
                .finally(() => setIsLoadingBlueprints(false))
        } else {
            setBlueprints([])
        }
    }, [form.botId, form.destinationType])

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Criar Redirecionador">
            <div className="redir-create">
                {step === 'domain' ? (
                    <>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            🌐 Escolha o Domínio — Selecione o domínio que aparecerá na URL do link
                        </p>
                        <div className="redir-domain-options">
                            <div className="redir-domain-option" onClick={() => { updateForm({ domain: window.location.host }); setStep('config') }}>
                                <span style={{ fontSize: '1.5rem' }}>🌐</span>
                                <div><h4>{window.location.host}</h4><p>Domínio atual</p></div>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    </>
                ) : (
                    <>
                        {/* Slug Type */}
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 6, display: 'block' }}>TIPO DE SLUG</label>
                            <div className="redir-slug-type">
                                <button className={`redir-slug-btn ${form.slugType === 'random' ? 'active' : ''}`} onClick={() => updateForm({ slugType: 'random' })}>🔀 Aleatório</button>
                                <button className={`redir-slug-btn ${form.slugType === 'custom' ? 'active' : ''}`} onClick={() => updateForm({ slugType: 'custom' })}>✏️ Personalizado</button>
                            </div>
                        </div>

                        {/* Slug + Mode */}
                        <div className="redir-slug-row">
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>SLUG</label>
                                <Input
                                    name="slug"
                                    placeholder={form.slugType === 'random' ? (form.slug || 'aleatorio') : 'meu-link'}
                                    value={form.slug}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm({ slug: e.target.value })}
                                    disabled={form.slugType === 'random'}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MODO</label>
                                <select className="redir-dest-select" value={form.mode} onChange={e => updateForm({ mode: e.target.value })}>
                                    <option value="random">Aleatório</option>
                                    <option value="sequential">Sequencial</option>
                                    <option value="single">Única vez</option>
                                </select>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="redir-toggles">
                            <label className="redir-toggle-item">
                                <input type="checkbox" checked={form.isActive} onChange={e => updateForm({ isActive: e.target.checked })} /> Ativo
                            </label>
                            <label className="redir-toggle-item">
                                <input type="checkbox" checked={form.cloakerEnabled} onChange={e => updateForm({ cloakerEnabled: e.target.checked })} /> Cloaker
                            </label>
                        </div>

                        {/* Domain */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                            🌐 {form.domain} <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setStep('domain')}>Alterar</button>
                        </div>

                        {/* Destination */}
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>DESTINO</label>
                            <select className="redir-dest-select" value={form.destinationType} onChange={e => updateForm({ destinationType: e.target.value as any })}>
                                <option value="bot">⚡ Telegram (Bot)</option>
                                <option value="url">🌐 Landing Page (URL)</option>
                            </select>
                        </div>

                        {form.destinationType === 'url' ? (
                            <Input name="dest" placeholder="https://..." value={form.destinationUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm({ destinationUrl: e.target.value })} />
                        ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                    <select className="redir-dest-select" value={form.botId} onChange={e => updateForm({ botId: e.target.value })}>
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
                                            onChange={e => updateForm({ flowId: e.target.value })}
                                        >
                                            <option value="">Selecione um fluxo...</option>
                                            {blueprints?.map((bp: any) => (
                                                <option key={bp.id} value={bp.trigger}>
                                                    {bp.name} ({bp.trigger})
                                                </option>
                                            ))}
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
                                    <button className={`redir-cloaker-method ${form.cloakerMethod === 'safe_page' ? 'active' : ''}`} onClick={() => updateForm({ cloakerMethod: 'safe_page' })}>
                                        <h5>🛡️ Página Segura</h5>
                                        <span>Exibe página de segurança</span>
                                    </button>
                                    <button className={`redir-cloaker-method ${form.cloakerMethod === 'redirect' ? 'active' : ''}`} onClick={() => updateForm({ cloakerMethod: 'redirect' })}>
                                        <h5>↩️ Redirect</h5>
                                        <span>Redireciona para URL segura</span>
                                    </button>
                                    <button className={`redir-cloaker-method ${form.cloakerMethod === 'mirror' ? 'active' : ''}`} onClick={() => updateForm({ cloakerMethod: 'mirror' })}>
                                        <h5>🪞 Espelho</h5>
                                        <span>Clona outra página</span>
                                    </button>
                                </div>
                                {(form.cloakerMethod === 'redirect' || form.cloakerMethod === 'mirror') && (
                                    <div style={{ marginTop: 'var(--space-md)' }}>
                                        <Input name="safeUrl" placeholder={form.cloakerMethod === 'redirect' ? 'URL de redirecionamento seguro' : 'URL do site para espelhar'} value={form.cloakerSafeUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm({ cloakerSafeUrl: e.target.value })} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                            <Button onClick={onSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Criando...' : '✓ Criar'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
