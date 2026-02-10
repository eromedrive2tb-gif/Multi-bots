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
        <header className="header">
            <div className="header-left">
                <h1 className="header-title">{title}</h1>
            </div>
            <div className="header-right">
                <UserAvatar name={user.name} size="sm" showDropdown />
            </div>
        </header>
    )
}
