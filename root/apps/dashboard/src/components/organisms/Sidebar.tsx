import type { FC } from 'hono/jsx'
import { NavLink } from '../molecules/NavLink'
import { UserAvatar } from '../molecules/UserAvatar'

interface SidebarProps {
    currentPath: string
    user: {
        name: string
        email: string
    }
}

export const Sidebar: FC<SidebarProps> = ({ currentPath, user }) => {
    const navItems = [
        { href: '/dashboard', icon: '📊', label: 'Dashboard' },
        { href: '/dashboard/bots', icon: '🤖', label: 'Gerenciar Bots' },
        { href: '/dashboard/blueprints', icon: '📋', label: 'Blueprints' },
        { href: '/dashboard/settings', icon: '⚙️', label: 'Configurações' },
    ]

    return (
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <span class="logo-icon">🚀</span>
                    <span class="logo-text">Multi-Bots</span>
                </div>
            </div>

            <nav class="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        href={item.href}
                        icon={item.icon}
                        active={currentPath === item.href}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div class="sidebar-footer">
                <UserAvatar name={user.name} email={user.email} size="sm" />
                <form method="post" action="/api/auth/logout" class="logout-form">
                    <button type="submit" class="btn btn-ghost btn-sm">
                        🚪 Sair
                    </button>
                </form>
            </div>
        </aside>
    )
}
