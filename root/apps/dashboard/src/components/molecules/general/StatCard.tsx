/** @jsxImportSource react */
import React from 'react'
import { Card, CardBody } from '../../atoms/ui/Card'

interface StatCardProps {
    label: string
    value: string | number
    icon?: string
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
        <Card className={`stat-card ${className}`}>
            <CardBody>
                <div className="stat-card-content">
                    {icon && (
                        <div
                            className="stat-icon"
                            style={iconBg ? { background: iconBg, color: 'inherit' } : undefined}
                        >
                            {icon}
                        </div>
                    )}
                    <div className="stat-info">
                        <span className="stat-label">{label}</span>
                        <span className="stat-value">{value}</span>
                        {trend && trendValue && (
                            <span className={`stat-trend stat-trend-${trend}`}>
                                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                            </span>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
