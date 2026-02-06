import type { FC } from 'hono/jsx'
import { UserAvatar } from '../molecules/UserAvatar'

interface HeaderProps {
    title: string
    user: {
        name: string
        email: string
    }
}

export const Header: FC<HeaderProps> = ({ title, user }) => {
    return (
        <header class="header">
            <div class="header-left">
                <h1 class="header-title">{title}</h1>
            </div>
            <div class="header-right">
                <UserAvatar name={user.name} size="sm" showDropdown />
            </div>
        </header>
    )
}
