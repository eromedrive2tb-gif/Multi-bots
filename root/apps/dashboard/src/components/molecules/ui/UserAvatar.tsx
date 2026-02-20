/** @jsxImportSource react */
import type { FC } from 'react'
import { ChevronDown } from 'lucide-react'

interface UserAvatarProps {
    name: string
    email?: string
    size?: 'sm' | 'md' | 'lg'
    showDropdown?: boolean
}

export const UserAvatar: FC<UserAvatarProps> = ({
    name,
    email,
    size = 'md',
    showDropdown = false,
}) => {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className={`user-avatar user-avatar-${size}`}>
            <div className="avatar-circle">{initials}</div>
            {(name || email) && (
                <div className="avatar-info">
                    {name && <span className="avatar-name">{name}</span>}
                    {email && <span className="avatar-email">{email}</span>}
                </div>
            )}
            {showDropdown && <span className="avatar-dropdown"><ChevronDown size={14} /></span>}
        </div>
    )
}
