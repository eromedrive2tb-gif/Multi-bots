/** @jsxImportSource react */
import type { FC, ReactNode } from 'react'

interface BadgeProps {
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
    className?: string
    children: ReactNode
}

export const Badge: FC<BadgeProps> = ({
    variant = 'neutral',
    className = '',
    children,
}) => {
    return <span className={`badge badge-${variant} ${className}`}>{children}</span>
}
