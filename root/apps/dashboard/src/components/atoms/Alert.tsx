import type { FC } from 'hono/jsx'

interface AlertProps {
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    details?: string
    dismissible?: boolean
}

const typeConfig: Record<AlertProps['type'], { icon: string; bgColor: string; borderColor: string }> = {
    success: {
        icon: '✅',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'var(--color-success)',
    },
    error: {
        icon: '❌',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'var(--color-danger)',
    },
    warning: {
        icon: '⚠️',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'var(--color-warning)',
    },
    info: {
        icon: 'ℹ️',
        bgColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: 'var(--color-primary)',
    },
}

export const Alert: FC<AlertProps> = ({ type, message, details, dismissible = true }) => {
    const config = typeConfig[type]

    return (
        <div
            class={`alert-banner alert-${type}`}
            style={`--alert-bg: ${config.bgColor}; --alert-border: ${config.borderColor}`}
        >
            <span class="alert-icon">{config.icon}</span>
            <div class="alert-content">
                <span class="alert-message">{message}</span>
                {details && <span class="alert-details">{details}</span>}
            </div>
            {dismissible && (
                <button
                    type="button"
                    class="alert-dismiss"
                    onclick="this.parentElement.remove()"
                >
                    ✕
                </button>
            )}
        </div>
    )
}
