import type { FC } from 'hono/jsx'
import { Card, CardBody } from '../atoms/Card'

interface StatCardProps {
    label: string
    value: string | number
    icon?: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    class?: string
}

export const StatCard: FC<StatCardProps> = ({
    label,
    value,
    icon,
    trend,
    trendValue,
    class: className = '',
}) => {
    return (
        <Card class={`stat-card ${className}`}>
            <CardBody>
                <div class="stat-card-content">
                    {icon && <div class="stat-icon">{icon}</div>}
                    <div class="stat-info">
                        <span class="stat-label">{label}</span>
                        <span class="stat-value">{value}</span>
                        {trend && trendValue && (
                            <span class={`stat-trend stat-trend-${trend}`}>
                                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                            </span>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
