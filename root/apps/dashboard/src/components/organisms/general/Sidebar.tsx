/** @jsxImportSource react */
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavLink } from '../../molecules/ui/NavLink'
import { UserAvatar } from '../../molecules/ui/UserAvatar'

interface SidebarProps {
    currentPath: string
    user: {
        name: string
        email: string
    }
}

interface NavSection {
    title: string
    items: { href: string; icon: string; label: string; subtitle?: string }[]
}

export const Sidebar: FC<SidebarProps> = ({ currentPath, user }) => {
    const navigate = useNavigate()

    const sections: NavSection[] = [
        {
            title: 'MENU',
            items: [
                { href: '/dashboard', icon: '📊', label: 'Dashboard', subtitle: 'Visão geral' },
                { href: '/dashboard/analytics', icon: '📈', label: 'Analises', subtitle: 'Métricas e relatórios' },
                { href: '/dashboard/financeiro', icon: '💰', label: 'Financeiro', subtitle: 'Receitas e transações' },
                { href: '/dashboard/customers', icon: '👥', label: 'Clientes', subtitle: 'Base de leads' },
            ],
        },
        {
            title: 'AUTOMAÇÕES',
            items: [
                { href: '/dashboard/bots', icon: '🤖', label: 'Meus Robos', subtitle: 'Gerenciar bots' },
                { href: '/dashboard/blueprints', icon: '🔧', label: 'Meus Fluxos', subtitle: 'Fluxos de venda' },
                { href: '/dashboard/redirecionadores', icon: '🔗', label: 'Redirecionadores', subtitle: 'Links e cloaking' },
                { href: '/dashboard/remarketing', icon: '🎯', label: 'Remarketing', subtitle: 'Campanhas' },
                { href: '/dashboard/postagens', icon: '📨', label: 'Postagens', subtitle: 'Envios e agendamentos' },
            ],
        },
        {
            title: 'INTEGRAÇÕES',
            items: [
                { href: '/dashboard/gateways', icon: '💳', label: 'Gateways', subtitle: 'Pagamentos PIX' },
                { href: '/dashboard/webapps', icon: '📱', label: 'WebApps', subtitle: 'Mini aplicativos' },
                { href: '/dashboard/settings', icon: '⚙️', label: 'Configurações', subtitle: 'Preferências' },
            ],
        },
    ]

    const handleLogout = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            navigate('/login')
        } catch (error) {
            console.error('Logout failed:', error)
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
                        {section.items.map((item) => (
                            <NavLink
                                key={item.href}
                                href={item.href}
                                icon={item.icon}
                                active={currentPath === item.href}
                            >
                                <span className="nav-label-group">
                                    <span>{item.label}</span>
                                    {item.subtitle && <span className="nav-subtitle">{item.subtitle}</span>}
                                </span>
                            </NavLink>
                        ))}
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
