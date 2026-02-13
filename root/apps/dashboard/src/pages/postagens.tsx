/** @jsxImportSource react */
import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates'
import { Button } from '../components/atoms/ui/Button'
import { Spinner } from '../components/atoms/ui/Spinner'
import { Input } from '../components/atoms/ui/Input'

type TabKey = 'enviar' | 'agendadas' | 'bemvindo' | 'repost'

interface InlineButton { text: string; url: string }
interface BroadcastDraft {
    botId: string; channelId: string; cdnChannelId: string;
    content: string; mediaUrl: string; mediaType: string;
    buttons: InlineButton[]; scheduledAt: string
}

export const PostagensPage: React.FC = () => {
    const qc = useQueryClient()
    const [tab, setTab] = useState<TabKey>('enviar')
    const textRef = useRef<HTMLTextAreaElement>(null)
    const [draft, setDraft] = useState<BroadcastDraft>({
        botId: '', channelId: '', cdnChannelId: '', content: '',
        mediaUrl: '', mediaType: '', buttons: [], scheduledAt: ''
    })
    const [newBtn, setNewBtn] = useState({ text: '', url: '' })

    const { data: bots } = useQuery<any[]>({
        queryKey: ['bots-list'], queryFn: async () => {
            const res = await fetch('/api/bots'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data
        },
    })

    const { data: broadcasts, isLoading: loadingBc } = useQuery<any[]>({
        queryKey: ['broadcasts'], queryFn: async () => {
            const res = await fetch('/api/broadcasts'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data || []
        },
    })

    const { data: scheduled } = useQuery<any[]>({
        queryKey: ['scheduled-broadcasts'], queryFn: async () => {
            const res = await fetch('/api/broadcasts?status=scheduled'); const r = await res.json() as any
            if (!r.success) throw new Error(r.error); return r.data || []
        },
    })

    const sendMut = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/broadcasts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botId: draft.botId, type: draft.channelId ? 'channel' : 'broadcast',
                    targetId: draft.channelId || undefined,
                    content: { text: draft.content, media_url: draft.mediaUrl || undefined, buttons: draft.buttons.length ? draft.buttons : undefined },
                }),
            })
            const r = await res.json() as any; if (!r.success) throw new Error(r.error)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['broadcasts'] })
            setDraft(d => ({ ...d, content: '', mediaUrl: '', buttons: [] }))
        },
    })

    const insertFormat = (before: string, after: string) => {
        const ta = textRef.current; if (!ta) return
        const { selectionStart, selectionEnd, value } = ta
        const selected = value.substring(selectionStart, selectionEnd)
        const newVal = value.substring(0, selectionStart) + before + selected + after + value.substring(selectionEnd)
        setDraft(d => ({ ...d, content: newVal }))
        setTimeout(() => { ta.focus(); ta.setSelectionRange(selectionStart + before.length, selectionEnd + before.length) }, 0)
    }

    const addButton = () => {
        if (!newBtn.text || !newBtn.url) return
        setDraft(d => ({ ...d, buttons: [...d.buttons, { ...newBtn }] }))
        setNewBtn({ text: '', url: '' })
    }

    const removeButton = (i: number) => setDraft(d => ({ ...d, buttons: d.buttons.filter((_, idx) => idx !== i) }))

    const tabs: { key: TabKey; label: string; icon: string }[] = [
        { key: 'enviar', label: 'Enviar Agora', icon: '📨' },
        { key: 'agendadas', label: 'Agendadas', icon: '📅' },
        { key: 'bemvindo', label: 'Boas-vindas', icon: '👋' },
        { key: 'repost', label: 'Repost', icon: '🔁' },
    ]

    const formatPreview = (text: string) => {
        return text
            .replace(/\*([^*]+)\*/g, '<b>$1</b>')
            .replace(/_([^_]+)_/g, '<i>$1</i>')
            .replace(/~([^~]+)~/g, '<s>$1</s>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>')
    }

    return (
        <DashboardLayout title="Postagens" currentPath="/dashboard/postagens">
            <style>{`
                .post-page { display: flex; flex-direction: column; gap: var(--space-xl); }
                .post-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .post-header h1 { margin: 0; font-size: 1.5rem; }
                .post-header p { margin: 4px 0 0; font-size: 0.85rem; color: var(--color-text-muted); }

                .post-tabs {
                    display: flex; gap: var(--space-xs);
                    border-bottom: 1px solid var(--color-border); padding-bottom: 0;
                }
                .post-tab {
                    padding: 10px 18px; font-size: 0.85rem; font-weight: 500;
                    border: none; background: transparent; cursor: pointer;
                    color: var(--color-text-muted); border-bottom: 2px solid transparent;
                    transition: all var(--transition-fast);
                }
                .post-tab:hover { color: var(--color-text-primary); }
                .post-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

                /* Editor Layout */
                .post-editor-layout { display: grid; grid-template-columns: 1fr 380px; gap: var(--space-xl); }

                .post-editor-panel {
                    display: flex; flex-direction: column; gap: var(--space-lg);
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-xl);
                }

                .post-selectors { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); }
                .post-select {
                    width: 100%; padding: 10px 12px; border-radius: var(--radius-md);
                    background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
                    color: var(--color-text-primary); font-size: 0.8rem; cursor: pointer;
                }
                .post-select-label { font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); letter-spacing: 0.05em; margin-bottom: 4px; }

                /* Rich text toolbar */
                .post-toolbar {
                    display: flex; gap: 2px; padding: 6px; background: var(--color-bg-tertiary);
                    border: 1px solid var(--color-border); border-bottom: none;
                    border-radius: var(--radius-md) var(--radius-md) 0 0;
                }
                .post-toolbar-btn {
                    width: 32px; height: 32px; border: none; background: transparent;
                    border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem;
                    color: var(--color-text-secondary);
                    transition: all var(--transition-fast);
                }
                .post-toolbar-btn:hover { background: var(--color-bg-card); color: var(--color-text-primary); }

                .post-textarea {
                    width: 100%; min-height: 200px; padding: var(--space-md);
                    background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
                    border-radius: 0 0 var(--radius-md) var(--radius-md);
                    color: var(--color-text-primary); font-size: 0.85rem;
                    resize: vertical; font-family: inherit;
                }
                .post-textarea:focus { outline: none; border-color: var(--color-primary); }

                /* Media upload */
                .post-media-zone {
                    border: 2px dashed var(--color-border); border-radius: var(--radius-lg);
                    padding: var(--space-xl); text-align: center; cursor: pointer;
                    transition: all var(--transition-fast); color: var(--color-text-muted);
                }
                .post-media-zone:hover { border-color: var(--color-primary); color: var(--color-primary); }
                .post-media-tabs { display: flex; gap: var(--space-sm); margin-bottom: var(--space-sm); }
                .post-media-tab {
                    padding: 4px 12px; border-radius: var(--radius-full); font-size: 0.75rem;
                    border: 1px solid var(--color-border); background: transparent;
                    color: var(--color-text-muted); cursor: pointer;
                }
                .post-media-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

                /* Inline buttons */
                .post-buttons-section { }
                .post-buttons-list { display: flex; flex-direction: column; gap: var(--space-sm); }
                .post-button-row {
                    display: flex; align-items: center; gap: var(--space-sm);
                    padding: 8px 12px; background: var(--color-bg-tertiary);
                    border-radius: var(--radius-md); font-size: 0.85rem;
                }
                .post-add-btn-row { display: flex; gap: var(--space-sm); align-items: center; }

                /* Preview panel */
                .post-preview-panel {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; flex-direction: column; height: fit-content; position: sticky; top: var(--space-lg);
                }
                .post-preview-header { font-size: 0.85rem; font-weight: 600; margin-bottom: var(--space-md); display: flex; align-items: center; gap: 6px; }
                .post-preview-phone {
                    background: var(--color-bg-secondary); border-radius: var(--radius-lg);
                    padding: var(--space-lg); min-height: 300px;
                    border: 1px solid var(--color-border);
                }
                .post-preview-msg {
                    background: var(--color-bg-tertiary); border-radius: var(--radius-md);
                    padding: var(--space-md); font-size: 0.85rem; line-height: 1.5;
                    word-break: break-word;
                }
                .post-preview-btns {
                    margin-top: var(--space-sm); display: flex; flex-direction: column; gap: 4px;
                }
                .post-preview-btn {
                    display: block; text-align: center;
                    padding: 8px; background: rgba(6,182,212,.1); border: 1px solid rgba(6,182,212,.3);
                    border-radius: var(--radius-sm); font-size: 0.8rem; color: #06b6d4;
                    text-decoration: none;
                }

                /* Scheduled & history */
                .post-queue-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .post-queue-info h4 { margin: 0; font-size: 0.9rem; }
                .post-queue-info p { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); }

                .post-empty {
                    text-align: center; padding: var(--space-2xl); color: var(--color-text-muted);
                }
                .post-empty .icon { font-size: 3rem; margin-bottom: var(--space-md); }

                .loading-center { display: flex; justify-content: center; padding: var(--space-2xl); }
            `}</style>

            <div className="post-page">
                <div className="post-header">
                    <div>
                        <h1>Postagens</h1>
                        <p>Disparador de mensagens e agendamentos</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="post-tabs">
                    {tabs.map(t => (
                        <button key={t.key} className={`post-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* TAB: Enviar Agora */}
                {tab === 'enviar' && (
                    <div className="post-editor-layout">
                        <div className="post-editor-panel">
                            {/* Bot / Channel / CDN selectors */}
                            <div className="post-selectors">
                                <div>
                                    <div className="post-select-label">BOT</div>
                                    <select className="post-select" value={draft.botId} onChange={e => setDraft(d => ({ ...d, botId: e.target.value }))}>
                                        <option value="">Selecione um bot</option>
                                        {bots?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div className="post-select-label">GRUPO/CANAL (DESTINO)</div>
                                    <Input name="channel" placeholder="@canal ou ID" value={draft.channelId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, channelId: e.target.value }))} />
                                </div>
                                <div>
                                    <div className="post-select-label">CANAL CDN (ARMAZENAMENTO)</div>
                                    <Input name="cdn" placeholder="@canal_cdn" value={draft.cdnChannelId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, cdnChannelId: e.target.value }))} />
                                </div>
                            </div>

                            {/* Rich text editor */}
                            <div>
                                <div className="post-toolbar">
                                    <button className="post-toolbar-btn" title="Negrito" onClick={() => insertFormat('*', '*')}><b>B</b></button>
                                    <button className="post-toolbar-btn" title="Itálico" onClick={() => insertFormat('_', '_')}><i>I</i></button>
                                    <button className="post-toolbar-btn" title="Sublinhado" onClick={() => insertFormat('__', '__')}><u>U</u></button>
                                    <button className="post-toolbar-btn" title="Tachado" onClick={() => insertFormat('~', '~')}><s>S</s></button>
                                    <button className="post-toolbar-btn" title="Código" onClick={() => insertFormat('`', '`')}>{'<>'}</button>
                                    <button className="post-toolbar-btn" title="Spoiler" onClick={() => insertFormat('||', '||')}>👁️</button>
                                    <button className="post-toolbar-btn" title="Citação" onClick={() => insertFormat('> ', '')}>❝</button>
                                </div>
                                <textarea
                                    ref={textRef}
                                    className="post-textarea"
                                    placeholder="Digite sua mensagem..."
                                    value={draft.content}
                                    onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                                />
                            </div>

                            {/* Media Upload */}
                            <div>
                                <div className="post-media-tabs">
                                    <button className={`post-media-tab ${!draft.mediaType || draft.mediaType === 'image' ? 'active' : ''}`} onClick={() => setDraft(d => ({ ...d, mediaType: 'image' }))}>🖼️ Imagem (10MB)</button>
                                    <button className={`post-media-tab ${draft.mediaType === 'video' ? 'active' : ''}`} onClick={() => setDraft(d => ({ ...d, mediaType: 'video' }))}>🎬 Vídeo/Áudio (50MB)</button>
                                </div>
                                <div className="post-media-zone">
                                    <div>📤</div>
                                    <p style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>Arraste ou clique para enviar</p>
                                    <Input name="mediaUrl" placeholder="ou cole uma URL de mídia" value={draft.mediaUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, mediaUrl: e.target.value }))} />
                                </div>
                            </div>

                            {/* Inline Buttons */}
                            <div className="post-buttons-section">
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>⌨️ Botões Inline</div>
                                <div className="post-buttons-list">
                                    {draft.buttons.map((btn, i) => (
                                        <div key={i} className="post-button-row">
                                            <span style={{ flex: 1 }}>📎 {btn.text}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{btn.url}</span>
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removeButton(i)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="post-add-btn-row" style={{ marginTop: 8 }}>
                                    <Input name="btnText" placeholder="Texto do botão" value={newBtn.text} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBtn(b => ({ ...b, text: e.target.value }))} />
                                    <Input name="btnUrl" placeholder="URL" value={newBtn.url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBtn(b => ({ ...b, url: e.target.value }))} />
                                    <Button size="sm" variant="secondary" onClick={addButton}>+ Adicionar</Button>
                                </div>
                            </div>

                            <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || !draft.botId || !draft.content}>
                                {sendMut.isPending ? '⏳ Enviando...' : '📨 Enviar Agora'}
                            </Button>
                        </div>

                        {/* Live Preview */}
                        <div className="post-preview-panel">
                            <div className="post-preview-header">📱 Pré-visualização</div>
                            <div className="post-preview-phone">
                                {draft.mediaUrl && (
                                    <div style={{ marginBottom: 'var(--space-sm)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center', fontSize: '2rem' }}>
                                        {draft.mediaType === 'video' ? '🎬' : '🖼️'}
                                    </div>
                                )}
                                {draft.content ? (
                                    <div className="post-preview-msg" dangerouslySetInnerHTML={{ __html: formatPreview(draft.content) }} />
                                ) : (
                                    <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                        A mensagem aparecerá aqui...
                                    </div>
                                )}
                                {draft.buttons.length > 0 && (
                                    <div className="post-preview-btns">
                                        {draft.buttons.map((btn, i) => (
                                            <span key={i} className="post-preview-btn">🔗 {btn.text}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: Agendadas */}
                {tab === 'agendadas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>📅 Filas de Envio</h3>
                            <Button>+ Nova Fila</Button>
                        </div>
                        {!scheduled?.length ? (
                            <div className="post-empty">
                                <div className="icon">📅</div>
                                <strong>Nenhuma fila criada</strong>
                                <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Crie filas para agendar envios em horários específicos</p>
                            </div>
                        ) : scheduled.map((s: any) => (
                            <div key={s.id} className="post-queue-card">
                                <div className="post-queue-info">
                                    <h4>{s.content?.text?.slice(0, 60) || 'Sem título'}...</h4>
                                    <p>Agendado para: {new Date(s.scheduledAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <Button size="sm" variant="secondary">⏸️ Pausar</Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: Boas-vindas */}
                {tab === 'bemvindo' && (
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)' }}>
                        <h3 style={{ margin: '0 0 4px' }}>👋 Mensagem de Boas-vindas</h3>
                        <p style={{ margin: '0 0 var(--space-lg)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Configure a mensagem que será enviada automaticamente quando um novo usuário iniciar o bot</p>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>BOT</label>
                            <select className="post-select" style={{ width: '100%', marginBottom: 'var(--space-md)' }}>
                                <option value="">Selecione um bot</option>
                                {bots?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <textarea className="post-textarea" placeholder="Mensagem de boas-vindas..." style={{ borderRadius: 'var(--radius-md)' }} />
                        <Button style={{ marginTop: 'var(--space-md)' }}>💾 Salvar</Button>
                    </div>
                )}

                {/* TAB: Repost */}
                {tab === 'repost' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>🔁 Filas de Repost</h3>
                            <Button>+ Criar Fila</Button>
                        </div>
                        <div className="post-empty">
                            <div className="icon">🔁</div>
                            <strong>Nenhuma fila de repost</strong>
                            <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Crie filas para reenviar mensagens automaticamente</p>
                        </div>
                    </div>
                )}

                {/* Recent history */}
                {tab === 'enviar' && broadcasts && broadcasts.length > 0 && (
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                        <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem' }}>📜 Histórico Recente</h3>
                        {broadcasts.slice(0, 5).map((b: any) => (
                            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                                <span>{b.content?.text?.slice(0, 80) || '—'}</span>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{new Date(b.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
