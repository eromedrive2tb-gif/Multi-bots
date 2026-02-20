/** @jsxImportSource react */
import React from 'react'
import { Bot, ClipboardList, Rocket, CheckCircle2, TrendingUp, XCircle } from 'lucide-react'
import type { OverviewMetrics } from '../../../../../engine/src/core/analytics-types'
import { StatsGrid } from './StatsGrid'

interface MetricsSummaryProps {
    metrics: OverviewMetrics
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({ metrics }) => {
    const stats = [
        {
            label: 'Total Bots',
            value: metrics.totalBots,
            icon: <Bot size={24} />,
            trend: 'neutral' as const,
            trendValue: `${metrics.activeBots} online`
        },
        {
            label: 'Blueprints',
            value: metrics.totalBlueprints,
            icon: <ClipboardList size={24} />,
            trend: 'neutral' as const,
            trendValue: `${metrics.activeBlueprints} ativos`
        },
        {
            label: 'Fluxos Iniciados',
            value: metrics.totalFlowStarts,
            icon: <Rocket size={24} />,
            trend: 'up' as const,
            trendValue: 'total'
        },
        {
            label: 'Fluxos Completos',
            value: metrics.totalFlowCompletions,
            icon: <CheckCircle2 size={24} />,
            trend: metrics.completionRate >= 50 ? 'up' as const : 'down' as const,
            trendValue: `${metrics.completionRate}% conversão`
        },
        {
            label: 'Taxa de Conversão',
            value: `${metrics.completionRate}%`,
            icon: <TrendingUp size={24} />,
            trend: metrics.completionRate >= 50 ? 'up' as const : 'down' as const,
            trendValue: 'início → fim'
        },
        {
            label: 'Erros',
            value: metrics.totalErrors,
            icon: <XCircle size={24} />,
            trend: metrics.totalErrors === 0 ? 'up' as const : 'down' as const,
            trendValue: metrics.totalErrors === 0 ? 'nenhum!' : 'atenção'
        },
    ]

    return (
        <div className="metrics-summary">
            <StatsGrid stats={stats} />
        </div>
    )
}
