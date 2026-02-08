/** @jsxImportSource react */
import React from 'react'
import { Card, CardBody } from '../atoms/Card'

interface StatCardProps {
    label: string
    value: string | number
    icon?: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    trend,
    trendValue,
    className = '',
}) => {
    return (
        <Card className={`stat-card ${className}`}>
            <CardBody>
                <div className="stat-card-content">
                    {icon && <div className="stat-icon">{icon}</div>}
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
