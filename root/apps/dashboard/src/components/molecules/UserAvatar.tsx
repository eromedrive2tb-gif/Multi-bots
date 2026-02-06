import type { FC } from 'hono/jsx'

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
        <div class={`user-avatar user-avatar-${size}`}>
            <div class="avatar-circle">{initials}</div>
            {(name || email) && (
                <div class="avatar-info">
                    {name && <span class="avatar-name">{name}</span>}
                    {email && <span class="avatar-email">{email}</span>}
                </div>
            )}
            {showDropdown && <span class="avatar-dropdown">▼</span>}
        </div>
    )
}
