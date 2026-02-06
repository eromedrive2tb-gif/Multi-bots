import type { FC } from 'hono/jsx'
import type { BotStatus, BotProvider } from '../../core/types'

interface StatusBadgeProps {
    status: BotStatus
    class?: string
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

export const StatusBadge: FC<StatusBadgeProps> = ({ status, class: className = '' }) => {
    const config = statusConfig[status]

    return (
        <span
            class={`status-badge status-${status} ${className}`}
            style={`--badge-color: ${config.color}`}
        >
            <span class="status-icon">{config.icon}</span>
            <span class="status-label">{config.label}</span>
        </span>
    )
}

interface ProviderBadgeProps {
    provider: BotProvider
    class?: string
}

const providerConfig: Record<BotProvider, { label: string; icon: string }> = {
    telegram: { label: 'Telegram', icon: '📱' },
    discord: { label: 'Discord', icon: '🎮' },
}

export const ProviderBadge: FC<ProviderBadgeProps> = ({ provider, class: className = '' }) => {
    const config = providerConfig[provider]

    return (
        <span class={`provider-badge provider-${provider} ${className}`}>
            <span class="provider-icon">{config.icon}</span>
            <span class="provider-label">{config.label}</span>
        </span>
    )
}
