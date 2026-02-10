/** @jsxImportSource react */
import type { FC, CSSProperties } from 'react'
import type { BotStatus, BotProvider } from '../../../../engine/src/core/types'

interface StatusBadgeProps {
    status: BotStatus
    className?: string
}

const statusConfig: Record<BotStatus, { label: string; color: string; icon: string }> = {
    online: {
        label: 'Online',
        color: 'var(--clr-success)',
        icon: '🟢',
    },
    offline: {
        label: 'Offline',
        color: 'var(--clr-text-muted)',
        icon: '⚫',
    },
    error: {
        label: 'Erro',
        color: 'var(--clr-danger)',
        icon: '🔴',
    },
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, className = '' }) => {
    const config = statusConfig[status]

    return (
        <span
            className={`status-badge status-${status} ${className}`}
            style={{ '--badge-color': config.color } as CSSProperties}
        >
            <span className="status-icon">{config.icon}</span>
            <span className="status-label">{config.label}</span>
        </span>
    )
}

interface ProviderBadgeProps {
    provider: BotProvider
    className?: string
}

const providerConfig: Record<BotProvider, { label: string; icon: string }> = {
    telegram: { label: 'Telegram', icon: '📱' },
    discord: { label: 'Discord', icon: '🎮' },
}

export const ProviderBadge: FC<ProviderBadgeProps> = ({ provider, className = '' }) => {
    const config = providerConfig[provider]

    return (
        <span className={`provider-badge provider-${provider} ${className}`}>
            <span className="provider-icon">{config.icon}</span>
            <span className="provider-label">{config.label}</span>
        </span>
    )
}
