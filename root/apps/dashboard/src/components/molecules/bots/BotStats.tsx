/** @jsxImportSource react */
import React from 'react'
import { StatCard } from '../general/StatCard'
import { Bot, CheckCircle2, AlertTriangle } from 'lucide-react'

interface BotStatsProps {
    total: number
    online: number
}

export const BotStats: React.FC<BotStatsProps> = ({ total, online }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
            <StatCard
                label="Total de Bots"
                value={total}
                icon={<Bot size={24} />}
                iconBg="rgba(6, 182, 212, 0.15)"
            />
            <StatCard
                label="Online"
                value={online}
                icon={<CheckCircle2 size={24} />}
                iconBg="rgba(16, 185, 129, 0.15)"
                trend="up"
                trendValue="Estável"
            />
            <StatCard
                label="Offline / Erro"
                value={total - online}
                icon={<AlertTriangle size={24} />}
                iconBg="rgba(239, 68, 68, 0.15)"
                trend={total - online > 0 ? 'down' : 'neutral'}
                trendValue="Atenção"
            />
        </div>
    )
}
