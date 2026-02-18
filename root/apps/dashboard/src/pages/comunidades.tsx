/** @jsxImportSource react */
import { FC, useState, useEffect } from 'react'
import { useSocket } from '../client/context/SocketContext'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Plus, Trash2, MessageSquare, RefreshCw, Users, ShieldCheck } from 'lucide-react'
import { Button } from '../components/atoms/ui/Button'
import { StatCard } from '../components/molecules/general/StatCard'
import { Modal } from '../components/molecules/ui/Modal'

// Types
interface VipGroup {
    id: string
    name: string
    type: 'group' | 'channel' | 'community'
    provider: 'telegram' | 'discord'
    providerId: string
    inviteLink?: string
    metadata: Record<string, any>
    createdAt: string
}

interface AddGroupForm {
    name: string
    provider: 'telegram' | 'discord'
    providerId: string
    type: 'group' | 'channel' | 'community'
    botId?: string
}

const Page: FC = () => {
    const [groups, setGroups] = useState<VipGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const { request, isConnected } = useSocket()

    // Form state
    const [formData, setFormData] = useState<AddGroupForm>({
        name: '',
        provider: 'telegram',
        providerId: '',
        type: 'group'
    })

    const fetchGroups = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await request<VipGroup[]>('FETCH_GROUPS')
            if (data) {
                setGroups(data)
            } else {
                setError('Nenhum grupo encontrado')
            }
        } catch (err) {
            setError('Erro ao carregar grupos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isConnected) {
            fetchGroups()
        }
    }, [isConnected])

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este grupo?')) return

        try {
            const success = await request('DELETE_GROUP', { id })
            if (success) {
                setGroups(groups.filter(g => g.id !== id))
            } else {
                alert(`Erro ao deletar grupo`)
            }
        } catch (err) {
            alert('Erro ao deletar grupo')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        try {
            const data = await request<VipGroup>('CREATE_GROUP', formData)

            if (data) {
                setGroups([data, ...groups])
                setIsModalOpen(false)
                setFormData({ name: '', provider: 'telegram', providerId: '', type: 'group' })
            } else {
                alert(`Erro ao criar grupo`)
            }
        } catch (err) {
            alert('Erro ao criar grupo')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSync = async () => {
        setSyncing(true)
        setError(null)
        try {
            const data = await request<any[]>('SYNC_GROUPS')

            if (data) {
                // Reload groups to show new/updated ones
                await fetchGroups()
                alert(`Sincronização concluída! ${data.length} grupos encontrados/atualizados.`)
            } else {
                alert(`Erro na sincronização`)
            }
        } catch (err) {
            alert('Erro ao conectar com servidor de sincronização')
        } finally {
            setSyncing(false)
        }
    }

    const stats = {
        total: groups.length,
        telegram: groups.filter(g => g.provider === 'telegram').length,
        discord: groups.filter(g => g.provider === 'discord').length
    }

    return (
        <DashboardLayout title="Comunidades VIP" currentPath="/dashboard/comunidades">
            <style>{`
                .page-container { display: flex; flex-direction: column; gap: var(--space-xl); }
                .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .page-header h1 { margin: 0; font-size: 1.5rem; color: var(--color-text-primary); }
                .page-header p { margin: 4px 0 0; font-size: 0.85rem; color: var(--color-text-muted); }
                
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
                
                .content-card {
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                }

                .groups-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--space-md);
                }

                .group-card {
                    background: var(--color-bg-tertiary);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: var(--space-lg);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                    transition: all 0.2s ease;
                }
                .group-card:hover {
                    border-color: var(--color-primary);
                    transform: translateY(-2px);
                }

                .group-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .group-info { display: flex; gap: var(--space-sm); align-items: center; }
                .provider-icon { 
                    width: 36px; height: 36px; 
                    border-radius: var(--radius-md); 
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.2rem;
                }
                .telegram { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .discord { background: rgba(88, 101, 242, 0.1); color: #5865f2; }
                
                .group-details h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--color-text-primary); }
                .group-details span { font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-muted); letter-spacing: 0.5px; }
                
                .group-actions { display: flex; gap: 4px; }
                .action-btn { 
                    padding: 6px; 
                    border-radius: var(--radius-md); 
                    color: var(--color-text-muted); 
                    transition: all 0.2s;
                    cursor: pointer;
                    background: transparent;
                    border: none;
                }
                .action-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
                .action-btn.delete:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                .meta-row { 
                    display: flex; justify-content: space-between; 
                    font-size: 0.8rem; color: var(--color-text-muted);
                    padding-top: var(--space-sm);
                    border-top: 1px solid var(--color-border);
                }
                .code-id { font-family: monospace; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; }

                /* Form Styles for Modal Payload */
                .modal-form { display: flex; flex-direction: column; gap: var(--space-lg); }
                .form-group { display: flex; flex-direction: column; gap: 6px; }
                .form-group label { font-size: 0.9rem; font-weight: 500; color: var(--color-text-secondary); }
                .form-input, .form-select {
                    padding: 10px 12px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--color-border);
                    background: var(--color-bg-tertiary);
                    color: var(--color-text-primary);
                    font-size: 0.9rem;
                    transition: border-color 0.2s;
                    width: 100%;
                }
                .form-input:focus, .form-select:focus { border-color: var(--color-primary); outline: none; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
                .form-hint { font-size: 0.8rem; color: var(--color-text-muted); margin: 0; }
                
                .modal-footer-actions {
                    padding-top: var(--space-lg);
                    border-top: 1px solid var(--color-border);
                    display: flex; justify-content: flex-end; gap: var(--space-md);
                    margin-top: var(--space-md);
                }
                
                .empty-state {
                    text-align: center; padding: 4rem 2rem;
                    display: flex; flex-direction: column; align-items: center; gap: var(--space-md);
                    color: var(--color-text-muted);
                }
                .empty-icon { width: 64px; height: 64px; color: var(--color-border); margin-bottom: var(--space-sm); }
            `}</style>

            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1>Gerenciar Comunidades</h1>
                        <p>Configure grupos e canais VIP para seus bots</p>
                    </div>
                </div>

                <div className="stats-grid">
                    <StatCard
                        label="TOTAL COMUNIDADES"
                        value={stats.total}
                        icon={<Users size={20} />}
                        iconBg="rgba(16, 185, 129, 0.1)"
                    />
                    <StatCard
                        label="TELEGRAM"
                        value={stats.telegram}
                        icon={<MessageSquare size={20} />}
                        iconBg="rgba(59, 130, 246, 0.1)"
                    />
                    <StatCard
                        label="DISCORD"
                        value={stats.discord}
                        icon={<MessageSquare size={20} />}
                        iconBg="rgba(88, 101, 242, 0.1)"
                    />
                </div>

                <div className="content-card">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Suas Comunidades</h2>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleSync} disabled={syncing}>
                                <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Sincronizando...' : 'Sincronizar'}
                            </Button>
                            <Button onClick={() => setIsModalOpen(true)}>
                                <Plus size={16} className="mr-2" />
                                Nova Comunidade
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex justify-between items-center border border-red-100">
                            <span>{error}</span>
                            <button onClick={fetchGroups}><RefreshCw size={16} /></button>
                        </div>
                    )}

                    {loading ? (
                        <div className="empty-state">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p>Carregando...</p>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="empty-state">
                            <ShieldCheck className="empty-icon" />
                            <h3 className="text-lg font-medium text-[color:var(--color-text-primary)]">Nenhuma comunidade encontrada</h3>
                            <p>Adicione seu primeiro grupo ou canal VIP para começar.</p>
                        </div>
                    ) : (
                        <div className="groups-grid">
                            {groups.map((group) => (
                                <div key={group.id} className="group-card cursor-pointer" onClick={(e) => {
                                    // Prevent navigation when clicking delete button
                                    if ((e.target as HTMLElement).closest('.action-btn')) return
                                    window.location.href = `/dashboard/comunidades/${group.id}`
                                }}>
                                    <div className="group-header">
                                        <div className="group-info">
                                            <div className={`provider-icon ${group.provider}`}>
                                                {group.provider === 'telegram' ? <i className="fab fa-telegram-plane" /> : <i className="fab fa-discord" />}
                                            </div>
                                            <div className="group-details">
                                                <h3>{group.name}</h3>
                                                <span>{group.type}</span>
                                            </div>
                                        </div>
                                        <div className="group-actions">
                                            <button onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(group.id)
                                            }} className="action-btn delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="meta-row">
                                        <span>ID: <span className="code-id">{group.providerId}</span></span>
                                        <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Comunidade">
                <form onSubmit={handleSubmit}>
                    <div className="modal-form">
                        <div className="form-group">
                            <label>Nome (Identificador)</label>
                            <input
                                className="form-input"
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Grupo VIP Gold"
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Provedor</label>
                                <select
                                    className="form-select"
                                    value={formData.provider}
                                    onChange={e => setFormData({ ...formData, provider: e.target.value as any })}
                                >
                                    <option value="telegram">Telegram</option>
                                    <option value="discord">Discord</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tipo</label>
                                <select
                                    className="form-select"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option value="group">Grupo</option>
                                    <option value="channel">Canal</option>
                                    <option value="community">Comunidade</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>ID do Chat / Guild</label>
                            <input
                                className="form-input"
                                type="text"
                                value={formData.providerId}
                                onChange={e => setFormData({ ...formData, providerId: e.target.value })}
                                placeholder={formData.provider === 'telegram' ? '-100...' : '12345...'}
                                required
                            />
                            <p className="form-hint">
                                {formData.provider === 'telegram'
                                    ? 'Adicione o bot como admin para obter o ID.'
                                    : 'Certifique-se que o bot está no servidor.'}
                            </p>
                        </div>
                    </div>
                    <div className="modal-footer-actions">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Adicionando...' : 'Adicionar'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}

export default Page
