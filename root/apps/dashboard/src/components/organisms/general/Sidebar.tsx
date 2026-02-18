/** @jsxImportSource react */
import { FC, useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { NavLink } from '../../molecules/ui/NavLink'
import { UserAvatar } from '../../molecules/ui/UserAvatar'
import { useSocket } from '../../../client/context/SocketContext'


interface SidebarProps {
    currentPath?: string
    user: {
        name: string
        email: string
    }
}

interface NavItem {
    href?: string
    icon: string
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
                    icon: '📊',
                    label: 'Dashboard',
                    children: [
                        { href: '/dashboard', icon: '', label: 'Visão Geral', subtitle: 'Receitas e transações' },
                        { href: '/dashboard/analytics', icon: '', label: 'Analises', subtitle: 'Métricas e relatórios' },
                    ],
                },
                {
                    icon: '💰',
                    label: 'Financeiro',
                    children: [
                        { href: '/dashboard/financeiro', icon: '📊', label: 'Visão Geral', subtitle: 'Receitas e transações' },
                        { href: '/dashboard/gateways', icon: '💳', label: 'Gateways', subtitle: 'Pagamentos PIX' },
                        { href: '/dashboard/planos', icon: '🏷️', label: 'Planos', subtitle: 'Pagamentos PIX' },
                        { href: '/dashboard/safepix-wallet', icon: '🏦', label: 'Carteira SafePix', subtitle: 'Pagamentos PIX' },
                    ],
                },
                { href: '/dashboard/customers', icon: '👥', label: 'Clientes', subtitle: 'Base de leads' },
            ],
        },
        {
            title: 'AUTOMAÇÕES',
            items: [
                {
                    icon: '🤖',
                    label: 'Meus Robos',
                    children: [
                        { href: '/dashboard/bots', icon: '🤖', label: 'Bots Hospedados', subtitle: 'Gerenciar bots' },
                        { href: '/dashboard/remarketing', icon: '🎯', label: 'Remarketing', subtitle: 'Campanhas' },
                        { href: '/dashboard/blueprints', icon: '🔧', label: 'Meus Fluxos', subtitle: 'Fluxos de venda' },
                        { href: '/dashboard/webapps', icon: '📱', label: 'WebApps', subtitle: 'Mini aplicativos' },
                    ],
                },
                {
                    icon: '📢',
                    label: 'Comunidades',
                    children: [
                        { href: '/dashboard/comunidades', icon: '📢', label: 'Comunidades', subtitle: 'Grupos e Canais VIP' },
                        { href: '/dashboard/postagens', icon: '📨', label: 'Postagens', subtitle: 'Envios e agendamentos' },
                    ],
                },
                { href: '/dashboard/redirecionadores', icon: '🔗', label: 'Redirecionadores', subtitle: 'Links e cloaking' },
            ],
        },
        {
            title: 'INTEGRAÇÕES',
            items: [
                { href: '/dashboard/settings', icon: '⚙️', label: 'Configurações', subtitle: 'Preferências' },
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
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon">🚀</span>
                    <span className="logo-text">Multi-Bots</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {sections.map((section) => (
                    <div key={section.title} className="sidebar-section">
                        <div className="sidebar-section-title">{section.title}</div>
                        {section.items.map((item) => {
                            if (item.children) {
                                const isOpen = !!openDropdowns[item.label]
                                return (
                                    <div key={item.label} className={`nav-dropdown ${isOpen ? 'nav-dropdown-open' : ''}`}>
                                        <button
                                            type="button"
                                            className="nav-dropdown-trigger"
                                            onClick={() => toggleDropdown(item.label)}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            <span className="nav-label-group">
                                                <span>{item.label}</span>
                                            </span>
                                            <span className="chevron">▼</span>
                                        </button>
                                        <div className="nav-dropdown-content">
                                            {item.children.map((child) => (
                                                <NavLink
                                                    key={child.href}
                                                    href={child.href!}
                                                    icon={child.icon}
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

            <div className="sidebar-footer">
                <UserAvatar name={user.name} email={user.email} size="sm" />
                <form onSubmit={handleLogout} className="logout-form">
                    <button type="submit" className="btn btn-ghost btn-sm">
                        🚪 Sair
                    </button>
                </form>
            </div>
        </aside>
    )
}
