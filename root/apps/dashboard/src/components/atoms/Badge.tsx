import type { FC } from 'hono/jsx'

interface BadgeProps {
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
    class?: string
    children: any
}

export const Badge: FC<BadgeProps> = ({
    variant = 'neutral',
    class: className = '',
    children,
}) => {
    return <span class={`badge badge-${variant} ${className}`}>{children}</span>
}
