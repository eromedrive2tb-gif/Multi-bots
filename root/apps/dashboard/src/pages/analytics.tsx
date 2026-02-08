/** @jsxImportSource react */
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'
import { FilterBar } from '../components/organisms/FilterBar'
import { MetricsSummary } from '../components/organisms/MetricsSummary'
import { BlueprintMetricsTable } from '../components/organisms/BlueprintMetricsTable'
import { BotStatusChart } from '../components/organisms/BotStatusChart'
import { QuickInsights } from '../components/organisms/QuickInsights'
import type { AnalyticsDashboardData } from '../lib/molecules/analytics-aggregator'
import type { AnalyticsFilterParams } from '../core/analytics-types'

export const AnalyticsPage: React.FC = () => {
    const [searchParams] = useSearchParams()

    const filters: AnalyticsFilterParams = {
        botId: searchParams.get('botId') || undefined,
        blueprintId: searchParams.get('blueprintId') || undefined,
        status: (searchParams.get('status') as any) || 'all',
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
    }

    const { data, isLoading, error } = useQuery<AnalyticsDashboardData>({
        queryKey: ['analytics', filters],
        queryFn: async () => {
            const query = new URLSearchParams()
            if (filters.botId) query.set('botId', filters.botId)
            if (filters.blueprintId) query.set('blueprintId', filters.blueprintId)
            if (filters.status && filters.status !== 'all') query.set('status', filters.status)
            if (filters.dateFrom) query.set('dateFrom', filters.dateFrom)
            if (filters.dateTo) query.set('dateTo', filters.dateTo)

            const response = await fetch(`/api/analytics?${query.toString()}`)
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error || 'Erro ao carregar dados')
            return result.data
        }
    })

    if (isLoading) {
        return (
            <DashboardLayout title="Analytics" currentPath="/dashboard/analytics">
                <div className="p-8 text-center">Carregando métricas...</div>
            </DashboardLayout>
        )
    }

    if (error || !data) {
        return (
            <DashboardLayout title="Analytics" currentPath="/dashboard/analytics">
                <div className="p-8 text-center text-danger">Erro: {(error as Error)?.message || 'Falha ao carregar dados'}</div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout
            title="Analytics"
            currentPath="/dashboard/analytics"
        >
            <div className="analytics-page">
                {/* Page Header */}
                <div className="analytics-header">
                    <div className="header-content">
                        <h2>📈 Analytics Dashboard</h2>
                        <p className="text-muted">
                            Visualize e gerencie métricas dos seus bots
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <Card>
                    <CardBody>
                        <FilterBar
                            bots={data.bots}
                            blueprints={data.blueprints}
                            currentFilters={filters}
                        />
                    </CardBody>
                </Card>

                {/* Overview Metrics */}
                <section className="analytics-section">
                    <MetricsSummary metrics={data.overview} />
                </section>

                {/* Charts Row */}
                <div className="analytics-grid">
                    {/* Blueprint Metrics Table */}
                    <Card className="analytics-card main">
                        <CardHeader>
                            <h3>📋 Métricas por Blueprint</h3>
                        </CardHeader>
                        <CardBody>
                            <BlueprintMetricsTable blueprints={data.blueprints} />
                        </CardBody>
                    </Card>

                    {/* Bot Status Chart */}
                    <Card className="analytics-card side">
                        <CardHeader>
                            <h3>🤖 Status dos Bots</h3>
                        </CardHeader>
                        <CardBody>
                            <BotStatusChart bots={data.bots} />
                        </CardBody>
                    </Card>
                </div>

                {/* Quick Insights */}
                <QuickInsights
                    overview={data.overview}
                    blueprints={data.blueprints}
                />
            </div>

            <style>{`
                .analytics-page { display: flex; flex-direction: column; gap: 24px; }
                .analytics-header { margin-bottom: 8px; }
                .analytics-header h2 { font-size: 1.5rem; margin: 0 0 4px 0; }
                .analytics-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
                @media (max-width: 1024px) { .analytics-grid { grid-template-columns: 1fr; } }
            `}</style>
        </DashboardLayout>
    )
}
