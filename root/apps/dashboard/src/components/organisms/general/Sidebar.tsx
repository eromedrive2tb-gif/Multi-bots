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

export const Sidebar: FC<SidebarProps> = ({ currentPath, user }) => {
    const navigate = useNavigate()
    const navItems = [
        { href: '/dashboard', icon: '📊', label: 'Dashboard' },
        { href: '/dashboard/analytics', icon: '📈', label: 'Analytics' },
        { href: '/dashboard/bots', icon: '🤖', label: 'Gerenciar Bots' },
        { href: '/dashboard/blueprints', icon: '📋', label: 'Blueprints' },
        { href: '/dashboard/settings', icon: '⚙️', label: 'Configurações' },
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
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        active={currentPath === item.href}
                    >
                        {item.label}
                    </NavLink>
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
