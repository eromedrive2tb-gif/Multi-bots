/** @jsxImportSource react */
import type { FC, CSSProperties } from 'react'
import { useState } from 'react'

interface AlertProps {
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    details?: string
    dismissible?: boolean
    onClose?: () => void
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

export const Alert: FC<AlertProps> = ({ type, message, details, dismissible = true, onClose }) => {
    const [isVisible, setIsVisible] = useState(true)
    const config = typeConfig[type]

    const handleDismiss = () => {
        setIsVisible(false)
        if (onClose) onClose()
    }

    if (!isVisible) return null

    return (
        <div
            className={`alert-banner alert-${type}`}
            style={{ '--alert-bg': config.bgColor, '--alert-border': config.borderColor } as CSSProperties}
        >
            <span className="alert-icon">{config.icon}</span>
            <div className="alert-content">
                <span className="alert-message">{message}</span>
                {details && <span className="alert-details">{details}</span>}
            </div>
            {dismissible && (
                <button
                    type="button"
                    className="alert-dismiss"
                    onClick={handleDismiss}
                >
                    ✕
                </button>
            )}
        </div>
    )
}
