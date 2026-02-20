/** @jsxImportSource react */
import type { FC } from 'react'
import { UserAvatar } from '../../molecules/ui/UserAvatar'

interface HeaderProps {
    title: string
    user: {
        name: string
        email: string
    }
}

export const Header: FC<HeaderProps> = ({ title, user }) => {
    return (
        <header className="header glass-panel border-b border-cyan-500/30" style={{ borderRight: 'none', borderLeft: 'none', borderTop: 'none' }}>
            <div className="header-left">
                <h1 className="header-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{title}</h1>
            </div>
            <div className="header-right">
                <UserAvatar name={user.name} size="sm" showDropdown />
            </div>
        </header>
    )
}
