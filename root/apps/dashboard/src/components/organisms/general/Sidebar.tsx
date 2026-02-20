/** @jsxImportSource react */
import { FC, useState, useEffect, useMemo, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { NavLink } from '../../molecules/ui/NavLink'
import { UserAvatar } from '../../molecules/ui/UserAvatar'
import { useSocket } from '../../../client/context/SocketContext'
import {
    LayoutDashboard, PieChart, DollarSign, CreditCard, Tag, Wallet,
    Users, Bot, Target, Workflow, Smartphone, MessageCircle, Send,
    Link, Settings, LogOut, ChevronDown, Rocket
} from 'lucide-react'

interface SidebarProps {
    currentPath?: string
    user: {
        name: string
        email: string
    }
}

interface NavItem {
    href?: string
    icon: ReactNode
    label: string
    subtitle?: string
    children?: NavItem[]
}

interface NavSection {
    title: string
    items: NavItem[]
}

export const Sidebar: FC<SidebarProps> = ({ user }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const currentPath = location.pathname
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})

    const sections: NavSection[] = useMemo(() => [
        {
            title: 'MENU',
            items: [
                {
                    icon: <LayoutDashboard size={20} className="text-cyan-neon" />,
                    label: 'Dashboard',
                    children: [
                        { href: '/dashboard', icon: <PieChart size={18} />, label: 'Visão Geral', subtitle: 'Receitas e transações' },
                        { href: '/dashboard/analytics', icon: <PieChart size={18} />, label: 'Analises', subtitle: 'Métricas e relatórios' },
                    ],
                },
                {
                    icon: <DollarSign size={20} className="text-cyan-neon" />,
                    label: 'Financeiro',
                    children: [
                        { href: '/dashboard/financeiro', icon: <PieChart size={18} />, label: 'Visão Geral', subtitle: 'Receitas e transações' },
                        { href: '/dashboard/gateways', icon: <CreditCard size={18} />, label: 'Gateways', subtitle: 'Pagamentos PIX' },
                        { href: '/dashboard/planos', icon: <Tag size={18} />, label: 'Planos', subtitle: 'Pagamentos PIX' },
                        { href: '/dashboard/safepix-wallet', icon: <Wallet size={18} />, label: 'Carteira SafePix', subtitle: 'Pagamentos PIX' },
                    ],
                },
                { href: '/dashboard/customers', icon: <Users size={20} className="text-cyan-neon" />, label: 'Clientes', subtitle: 'Base de leads' },
            ],
        },
        {
            title: 'AUTOMAÇÕES',
            items: [
                {
                    icon: <Bot size={20} className="text-cyan-neon" />,
                    label: 'Meus Robos',
                    children: [
                        { href: '/dashboard/bots', icon: <Bot size={18} />, label: 'Bots Hospedados', subtitle: 'Gerenciar bots' },
                        { href: '/dashboard/remarketing', icon: <Target size={18} />, label: 'Remarketing', subtitle: 'Campanhas' },
                        { href: '/dashboard/blueprints', icon: <Workflow size={18} />, label: 'Meus Fluxos', subtitle: 'Fluxos de venda' },
                        { href: '/dashboard/webapps', icon: <Smartphone size={18} />, label: 'WebApps', subtitle: 'Mini aplicativos' },
                    ],
                },
                {
                    icon: <MessageCircle size={20} className="text-cyan-neon" />,
                    label: 'Comunidades',
                    children: [
                        { href: '/dashboard/comunidades', icon: <MessageCircle size={18} />, label: 'Comunidades', subtitle: 'Grupos e Canais VIP' },
                        { href: '/dashboard/postagens', icon: <Send size={18} />, label: 'Postagens', subtitle: 'Envios e agendamentos' },
                    ],
                },
                { href: '/dashboard/redirecionadores', icon: <Link size={20} className="text-cyan-neon" />, label: 'Redirecionadores', subtitle: 'Links e cloaking' },
            ],
        },
        {
            title: 'INTEGRAÇÕES',
            items: [
                { href: '/dashboard/settings', icon: <Settings size={20} className="text-cyan-neon" />, label: 'Configurações', subtitle: 'Preferências' },
            ],
        },
    ], [])

    const toggleDropdown = (label: string) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [label]: !prev[label]
        }))
    }

    // Auto-open dropdown if current path is inside it
    useEffect(() => {
        const newOpenDropdowns: Record<string, boolean> = {}
        sections.forEach(section => {
            section.items.forEach(item => {
                if (item.children) {
                    const isActive = item.children.some(child => currentPath === child.href)
                    if (isActive) {
                        newOpenDropdowns[item.label] = true
                    }
                }
            })
        })
        setOpenDropdowns(prev => ({ ...prev, ...newOpenDropdowns }))
    }, [currentPath, sections])

    const { request } = useSocket()

    const handleLogout = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await request('LOGOUT', { sessionId: localStorage.getItem('sessionId') || '' })
            navigate('/login')
        } catch (error) {
            console.error('Logout failed:', error)
            // Fallback for session clear if socket fails
            navigate('/login')
        }
    }

    return (
        <aside className="sidebar glass-panel" style={{ borderRight: '1px solid var(--color-border)', background: 'rgba(2, 6, 23, 0.4)' }}>
            <div className="sidebar-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="logo" style={{ gap: '0.75rem' }}>
                    <div className="logo-icon-wrap" style={{
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
                    }}>
                        <Rocket size={20} color="white" />
                    </div>
                    <span className="logo-text text-gradient-primary" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Multi-Bots</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {sections.map((section) => (
                    <div key={section.title} className="sidebar-section">
                        <div className="sidebar-section-title" style={{ color: '#06b6d4', opacity: 0.8 }}>{section.title}</div>
                        {section.items.map((item) => {
                            if (item.children) {
                                const isOpen = !!openDropdowns[item.label]
                                return (
                                    <div key={item.label} className={`nav-dropdown ${isOpen ? 'nav-dropdown-open' : ''}`}>
                                        <button
                                            type="button"
                                            className="nav-dropdown-trigger"
                                            onClick={() => toggleDropdown(item.label)}
                                            style={{ color: isOpen ? 'white' : 'var(--color-text-secondary)' }}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            <span className="nav-label-group">
                                                <span>{item.label}</span>
                                            </span>
                                            <span className="chevron" style={{
                                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.3s ease'
                                            }}><ChevronDown size={14} /></span>
                                        </button>
                                        <div className="nav-dropdown-content">
                                            {item.children.map((child) => (
                                                <NavLink
                                                    key={child.href}
                                                    href={child.href!}
                                                    icon={<span style={{ opacity: 0.7 }}>{child.icon}</span>}
                                                    active={currentPath === child.href}
                                                    className="sub-nav-link"
                                                >
                                                    <span className="nav-label-group">
                                                        <span>{child.label}</span>
                                                        {child.subtitle && <span className="nav-subtitle">{child.subtitle}</span>}
                                                    </span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <NavLink
                                    key={item.href}
                                    href={item.href!}
                                    icon={item.icon}
                                    active={currentPath === item.href}
                                >
                                    <span className="nav-label-group">
                                        <span>{item.label}</span>
                                        {item.subtitle && <span className="nav-subtitle">{item.subtitle}</span>}
                                    </span>
                                </NavLink>
                            )
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer" style={{ borderTop: '1px solid var(--color-border)' }}>
                <UserAvatar name={user.name} email={user.email} size="sm" />
                <form onSubmit={handleLogout} className="logout-form mt-4" style={{ marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-ghost btn-sm w-full" style={{
                        width: '100%', justifyContent: 'flex-start', color: '#ef4444',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <LogOut size={16} /> <span style={{ fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Sair do Painel</span>
                    </button>
                </form>
            </div>
        </aside>
    )
}
