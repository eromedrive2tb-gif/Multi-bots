/** @jsxImportSource react */
import { FC, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../client/context/SocketContext'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { ArrowLeft, Trash2, Shield, User, Loader2, ExternalLink, Calendar } from 'lucide-react'
import { Button } from '../components/atoms/ui/Button'
import { StatCard } from '../components/molecules/general/StatCard'

interface GroupMember {
    id: string
    customer_id: string
    status: 'member' | 'administrator' | 'left' | 'kicked' | 'restricted'
    joined_at: string
    customer_name: string
    customer_username?: string
    external_id: string
}

interface VipGroup {
    id: string
    name: string
    type: string
    provider: 'telegram' | 'discord'
    providerId: string
    inviteLink?: string
    createdAt: string
    metadata?: {
        member_count?: number
        last_sync?: string
        [key: string]: any
    }
}

const ComunidadesDetailsPage: FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { request, isConnected } = useSocket()
    const [group, setGroup] = useState<VipGroup | null>(null)
    const [members, setMembers] = useState<GroupMember[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null) // memberId being acted on

    useEffect(() => {
        if (id && isConnected) {
            fetchData()
        }
    }, [id, isConnected])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Group
            const groupData = await request<VipGroup>('FETCH_GROUP', { id })

            if (groupData) {
                setGroup(groupData)
            } else {
                throw new Error('Grupo não encontrado')
            }

            // Fetch Members
            const membersData = await request<GroupMember[]>('FETCH_GROUP_MEMBERS', { groupId: id })

            if (membersData) {
                setMembers(membersData)
            }
        } catch (error) {
            console.error(error)
            alert('Erro ao carregar dados do grupo')
            navigate('/dashboard/comunidades')
        } finally {
            setLoading(false)
        }
    }

    const handleSyncMembers = async () => {
        if (!confirm('Deseja sincronizar a lista de membros? Isso pode levar alguns instantes.')) return

        setLoading(true)
        try {
            const data = await request<{ synced: number }>('SYNC_GROUP_MEMBERS', { groupId: id })

            if (data) {
                alert(`Sincronização concluída! ${data.synced} membros sincronizados.`)
                fetchData()
            } else {
                alert(`Erro na sincronização`)
            }
        } catch (e) {
            alert('Falha na sincronização')
        } finally {
            setLoading(false)
        }
    }

    const handleKick = async (member: GroupMember) => {
        if (!confirm(`Tem certeza que deseja remover ${member.customer_name || 'este usuário'} do grupo?`)) return

        setActionLoading(member.customer_id)
        try {
            const success = await request('KICK_MEMBER', { groupId: id, customerId: member.customer_id })

            if (success) {
                // Update local state
                setMembers(members.map(m =>
                    m.customer_id === member.customer_id ? { ...m, status: 'kicked' } : m
                ))
            } else {
                alert(`Erro ao remover membro`)
            }
        } catch (e) {
            alert('Falha ao remover membro')
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return (
            <DashboardLayout title="Carregando..." currentPath="/dashboard/comunidades">
                <div className="flex justify-center items-center h-full min-h-[400px]">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
            </DashboardLayout>
        )
    }

    if (!group) return null

    return (
        <DashboardLayout title={group.name} currentPath="/dashboard/comunidades">
            <style>{`
                .page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
                .back-btn { background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 0.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .back-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
                
                .group-overview { 
                    display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; 
                    margin-bottom: 2rem;
                }
                
                .info-card {
                   background: var(--color-bg-card);
                   border: 1px solid var(--color-border);
                   border-radius: var(--radius-lg);
                   padding: 1.5rem;
                }

                .member-list {
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                }
                .member-list-header {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .members-table { width: 100%; border-collapse: collapse; }
                .members-table th { text-align: left; padding: 0.75rem 1.5rem; font-size: 0.85rem; color: var(--color-text-muted); font-weight: 500; background: var(--color-bg-tertiary); }
                .members-table td { padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--color-border); font-size: 0.9rem; color: var(--color-text-primary); }
                .members-table tr:last-child td { border-bottom: none; }
                
                .status-badge { 
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; 
                }
                .status-member { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .status-administrator { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .status-left { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
                .status-kicked { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                .action-icon { cursor: pointer; color: var(--color-text-muted); transition: color 0.2s; }
                .action-icon:hover { color: #ef4444; }
                .action-icon.disabled { opacity: 0.5; cursor: not-allowed; }

                @media (max-width: 768px) {
                    .group-overview { grid-template-columns: 1fr; }
                }
            `}</style>

            <div className="page-header justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard/comunidades')} className="back-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[color:var(--color-text-primary)]">{group.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-[color:var(--color-text-muted)]">
                            <span className={`px-2 py-0.5 rounded text-xs capitalize ${group.provider === 'telegram' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {group.provider}
                            </span>
                            <span>•</span>
                            <span>{group.type}</span>
                            <span>•</span>
                            <span className="font-mono bg-gray-100 px-1 rounded">{group.providerId}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <Button variant="secondary" onClick={handleSyncMembers}>
                        <ExternalLink size={16} className="mr-2" />
                        Sincronizar Membros
                    </Button>
                </div>
            </div>

            <div className="group-overview">
                <div className="info-card">
                    <h3 className="text-lg font-semibold mb-4">Métricas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Total no Grupo"
                            value={group.metadata?.member_count || '-'}
                            icon={<User size={18} />}
                            iconBg="rgba(16, 185, 129, 0.1)"
                        />
                        <StatCard
                            label="Rastreados (BD)"
                            value={members.filter(m => ['member', 'administrator'].includes(m.status)).length}
                            icon={<User size={18} />}
                            iconBg="rgba(59, 130, 246, 0.1)"
                        />
                        <StatCard
                            label="Admins"
                            value={members.filter(m => m.status === 'administrator').length}
                            icon={<Shield size={18} />}
                            iconBg="rgba(59, 130, 246, 0.1)"
                        />
                        <StatCard
                            label="Saíram"
                            value={members.filter(m => m.status === 'left').length}
                            icon={<ExternalLink size={18} />}
                            iconBg="rgba(107, 114, 128, 0.1)"
                        />
                        <StatCard
                            label="Banidos"
                            value={members.filter(m => m.status === 'kicked').length}
                            icon={<Trash2 size={18} />}
                            iconBg="rgba(239, 68, 68, 0.1)"
                        />
                    </div>
                </div>

                <div className="info-card">
                    <h3 className="text-lg font-semibold mb-4">Informações</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[color:var(--color-text-muted)]">Criado em</span>
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(group.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        {group.inviteLink && (
                            <div className="flex justify-between items-center">
                                <span className="text-[color:var(--color-text-muted)]">Link de Convite</span>
                                <a href={group.inviteLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                    Abrir <ExternalLink size={14} />
                                </a>
                            </div>
                        )}
                        <div className="pt-2">
                            <Button variant="secondary" className="w-full" onClick={() => navigate('/dashboard/comunidades')}>
                                Voltar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="member-list">
                <div className="member-list-header flex-col items-start gap-2">
                    <div className="flex justify-between items-center w-full">
                        <h3 className="text-lg font-semibold">Membros ({members.length})</h3>
                    </div>
                    {group.provider === 'telegram' && (
                        <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200 w-full">
                            <strong>Nota:</strong> Devido a limitações da API do Telegram, apenas <strong>Administradores</strong> e o <strong>Bot</strong> podem ser listados aqui. O número total de membros é mostrado acima.
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="members-table">
                        <thead>
                            <tr>
                                <th>NOME</th>
                                <th>USUÁRIO</th>
                                <th>ENTROU EM</th>
                                <th>STATUS</th>
                                <th>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-[color:var(--color-text-muted)]">
                                        Nenhum membro registrado ainda.
                                    </td>
                                </tr>
                            ) : (
                                members.map(member => (
                                    <tr key={member.id}>
                                        <td>
                                            <div className="font-medium">{member.customer_name || 'Desconhecido'}</div>
                                            <div className="text-xs text-[color:var(--color-text-muted)] font-mono">{member.external_id}</div>
                                        </td>
                                        <td>{member.customer_username ? `@${member.customer_username}` : '-'}</td>
                                        <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`status-badge status-${member.status}`}>
                                                {member.status === 'administrator' && <Shield size={10} />}
                                                {member.status}
                                            </span>
                                        </td>
                                        <td>
                                            {['member', 'administrator'].includes(member.status) && (
                                                <button
                                                    onClick={() => handleKick(member)}
                                                    disabled={!!actionLoading}
                                                    className={`action-icon ${actionLoading === member.customer_id ? 'disabled' : ''}`}
                                                    title="Remover/Banir"
                                                >
                                                    {actionLoading === member.customer_id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </DashboardLayout>
    )
}

export default ComunidadesDetailsPage
