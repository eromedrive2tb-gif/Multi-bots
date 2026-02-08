import type { FC } from 'hono/jsx'
import type { OverviewMetrics } from '../../core/analytics-types'
import { StatsGrid } from './StatsGrid'

interface MetricsSummaryProps {
    metrics: OverviewMetrics
}

export const MetricsSummary: FC<MetricsSummaryProps> = ({ metrics }) => {
    const stats = [
        {
            label: 'Total Bots',
            value: metrics.totalBots,
            icon: '🤖',
            trend: 'neutral' as const,
            trendValue: `${metrics.activeBots} online`
        },
        {
            label: 'Blueprints',
            value: metrics.totalBlueprints,
            icon: '📋',
            trend: 'neutral' as const,
            trendValue: `${metrics.activeBlueprints} ativos`
        },
        {
            label: 'Fluxos Iniciados',
            value: metrics.totalFlowStarts,
            icon: '🚀',
            trend: 'up' as const,
            trendValue: 'total'
        },
        {
            label: 'Fluxos Completos',
            value: metrics.totalFlowCompletions,
            icon: '✅',
            trend: metrics.completionRate >= 50 ? 'up' as const : 'down' as const,
            trendValue: `${metrics.completionRate}% conversão`
        },
        {
            label: 'Taxa de Conversão',
            value: `${metrics.completionRate}%`,
            icon: '📈',
            trend: metrics.completionRate >= 50 ? 'up' as const : 'down' as const,
            trendValue: 'início → fim'
        },
        {
            label: 'Erros',
            value: metrics.totalErrors,
            icon: '❌',
            trend: metrics.totalErrors === 0 ? 'up' as const : 'down' as const,
            trendValue: metrics.totalErrors === 0 ? 'nenhum!' : 'atenção'
        },
    ]

    return (
        <div class="metrics-summary">
            <StatsGrid stats={stats} />
        </div>
    )
}
