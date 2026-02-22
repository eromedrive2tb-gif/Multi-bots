/** @jsxImportSource react */

import type { FC, CSSProperties } from 'react'
import { useState } from 'react'

// ============================================
// ATOM: DisclaimerBanner
// High-visibility warning banner for Dynamic Webapps
// ============================================

interface DisclaimerBannerProps {
    /** Emoji icon displayed on the left */
    icon?: string
    /** Bold title line */
    title?: string
    /** Main disclaimer text */
    message: string
    /** Visual variant */
    variant?: 'warning' | 'info' | 'caution'
    /** Allow dismissal */
    dismissible?: boolean
}

const variantConfig: Record<NonNullable<DisclaimerBannerProps['variant']>, {
    bg: string
    border: string
    iconBg: string
    titleColor: string
}> = {
    warning: {
        bg: 'rgba(245, 158, 11, 0.08)',
        border: '#f59e0b',
        iconBg: 'rgba(245, 158, 11, 0.15)',
        titleColor: '#d97706',
    },
    caution: {
        bg: 'rgba(239, 68, 68, 0.08)',
        border: '#ef4444',
        iconBg: 'rgba(239, 68, 68, 0.15)',
        titleColor: '#dc2626',
    },
    info: {
        bg: 'rgba(99, 102, 241, 0.08)',
        border: '#6366f1',
        iconBg: 'rgba(99, 102, 241, 0.15)',
        titleColor: '#4f46e5',
    },
}

export const DisclaimerBanner: FC<DisclaimerBannerProps> = ({
    icon = '⚠️',
    title,
    message,
    variant = 'warning',
    dismissible = false,
}) => {
    const [visible, setVisible] = useState(true)
    const config = variantConfig[variant]

    if (!visible) return null

    return (
        <>
            <div
                className="disclaimer-banner"
                role="alert"
                style={{
                    '--disclaimer-bg': config.bg,
                    '--disclaimer-border': config.border,
                    '--disclaimer-icon-bg': config.iconBg,
                    '--disclaimer-title-color': config.titleColor,
                } as CSSProperties}
            >
                <div className="disclaimer-icon-wrapper">
                    <span className="disclaimer-icon">{icon}</span>
                </div>
                <div className="disclaimer-content">
                    {title && <div className="disclaimer-title">{title}</div>}
                    <p className="disclaimer-message">{message}</p>
                </div>
                {dismissible && (
                    <button
                        type="button"
                        className="disclaimer-dismiss"
                        onClick={() => setVisible(false)}
                        aria-label="Fechar aviso"
                    >
                        ✕
                    </button>
                )}
            </div>

            <style>{`
                .disclaimer-banner {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 16px 20px;
                    background: var(--disclaimer-bg);
                    border: 1px solid var(--disclaimer-border);
                    border-left: 4px solid var(--disclaimer-border);
                    border-radius: 10px;
                    position: relative;
                    animation: disclaimerSlideIn 0.3s ease-out;
                }

                @keyframes disclaimerSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-6px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .disclaimer-icon-wrapper {
                    flex-shrink: 0;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--disclaimer-icon-bg);
                    border-radius: 8px;
                    font-size: 18px;
                }

                .disclaimer-content {
                    flex: 1;
                    min-width: 0;
                }

                .disclaimer-title {
                    font-weight: 700;
                    font-size: 0.875rem;
                    color: var(--disclaimer-title-color);
                    margin-bottom: 4px;
                    letter-spacing: -0.01em;
                }

                .disclaimer-message {
                    font-size: 0.8rem;
                    line-height: 1.55;
                    color: var(--color-text-secondary, #9ca3af);
                    margin: 0;
                }

                .disclaimer-dismiss {
                    position: absolute;
                    top: 10px;
                    right: 12px;
                    background: none;
                    border: none;
                    color: var(--color-text-muted, #6b7280);
                    cursor: pointer;
                    font-size: 0.75rem;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.15s;
                }

                .disclaimer-dismiss:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </>
    )
}
