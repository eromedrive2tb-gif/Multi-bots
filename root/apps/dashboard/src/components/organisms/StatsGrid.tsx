import type { FC } from 'hono/jsx'
import { StatCard } from '../molecules/StatCard'

interface Stat {
    label: string
    value: string | number
    icon?: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
}

interface StatsGridProps {
    stats: Stat[]
}

export const StatsGrid: FC<StatsGridProps> = ({ stats }) => {
    return (
        <div class="stats-grid">
            {stats.map((stat) => (
                <StatCard
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    trend={stat.trend}
                    trendValue={stat.trendValue}
                />
            ))}
        </div>
    )
}
