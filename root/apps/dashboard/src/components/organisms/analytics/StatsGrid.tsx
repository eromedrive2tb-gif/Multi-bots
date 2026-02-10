/** @jsxImportSource react */
import React from 'react'
import { StatCard } from '../../molecules/general/StatCard'

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

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
    return (
        <div className="stats-grid">
            {stats.map((stat, index) => (
                <StatCard
                    key={index}
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
