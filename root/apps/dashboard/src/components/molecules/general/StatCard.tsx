/** @jsxImportSource react */
import type { ReactNode } from 'react'
import { Card, CardBody } from '../../atoms/ui/Card'

interface StatCardProps {
    label: string
    value: string | number
    icon?: ReactNode
    iconBg?: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    iconBg,
    trend,
    trendValue,
    className = '',
}) => {
    return (
        <div
            className={`stat-card glass-panel hover:-translate-y-1 hover:shadow-glow transition-all duration-300 ${className}`}
            style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)'
            }}
        >
            {icon && (
                <div
                    className="stat-icon"
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        background: iconBg || 'rgba(6, 182, 212, 0.15)',
                        color: iconBg ? 'inherit' : '#22d3ee',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
                        flexShrink: 0
                    }}
                >
                    {icon}
                </div>
            )}
            <div className="stat-info" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>{label}</span>
                <span className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{value}</span>
                {trend && trendValue && (
                    <span className="stat-trend" style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : 'var(--color-text-muted)' }}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                    </span>
                )}
            </div>
        </div>
    )
}
