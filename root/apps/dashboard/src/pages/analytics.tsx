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
import type { AnalyticsDashboardData } from '../lib/molecules/analytics-aggregator'
import type { AnalyticsFilterParams, BlueprintMetric } from '../core/analytics-types'

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
                {data.blueprints.length > 0 && (
                    <Card className="analytics-card insights">
                        <CardHeader>
                            <h3>💡 Insights Rápidos</h3>
                        </CardHeader>
                        <CardBody>
                            <div className="insights-grid">
                                {/* Top Blueprint */}
                                <div className="insight-item">
                                    <span className="insight-icon">🏆</span>
                                    <div className="insight-content">
                                        <span className="insight-label">Blueprint mais usado</span>
                                        <span className="insight-value">
                                            {[...data.blueprints].sort((a: BlueprintMetric, b: BlueprintMetric) => b.flowStarts - a.flowStarts)[0]?.blueprintName || '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Best Conversion */}
                                {data.blueprints.filter((b: BlueprintMetric) => b.flowStarts > 0).length > 0 && (
                                    <div className="insight-item">
                                        <span className="insight-icon">📈</span>
                                        <div className="insight-content">
                                            <span className="insight-label">Melhor conversão</span>
                                            <span className="insight-value">
                                                {data.blueprints
                                                    .filter((b: BlueprintMetric) => b.flowStarts > 0)
                                                    .sort((a: BlueprintMetric, b: BlueprintMetric) => b.completionRate - a.completionRate)[0]?.blueprintName || '-'}
                                                {' '}
                                                ({data.blueprints
                                                    .filter((b: BlueprintMetric) => b.flowStarts > 0)
                                                    .sort((a: BlueprintMetric, b: BlueprintMetric) => b.completionRate - a.completionRate)[0]?.completionRate || 0}%)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Active Bots */}
                                <div className="insight-item">
                                    <span className="insight-icon">🟢</span>
                                    <div className="insight-content">
                                        <span className="insight-label">Bots ativos</span>
                                        <span className="insight-value">
                                            {data.overview.activeBots} de {data.overview.totalBots}
                                        </span>
                                    </div>
                                </div>

                                {/* Error Alert */}
                                {data.overview.totalErrors > 0 && (
                                    <div className="insight-item alert">
                                        <span className="insight-icon">⚠️</span>
                                        <div className="insight-content">
                                            <span className="insight-label">Erros detectados</span>
                                            <span className="insight-value">
                                                {data.overview.totalErrors} erros registrados
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}
