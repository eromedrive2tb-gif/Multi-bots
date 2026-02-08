import type { FC } from 'hono/jsx'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'
import { FilterBar } from '../components/organisms/FilterBar'
import { MetricsSummary } from '../components/organisms/MetricsSummary'
import { BlueprintMetricsTable } from '../components/organisms/BlueprintMetricsTable'
import { BotStatusChart } from '../components/organisms/BotStatusChart'
import type { AnalyticsDashboardData } from '../lib/molecules/analytics-aggregator'
import type { AnalyticsFilterParams, BlueprintMetric } from '../core/analytics-types'
import { ClearMetricsButton } from '../components/molecules/ClearMetricsButton'

interface AnalyticsPageProps {
    user: {
        name: string
        email: string
    }
    data: AnalyticsDashboardData
    filters: AnalyticsFilterParams
}

export const AnalyticsPage: FC<AnalyticsPageProps> = ({ user, data, filters }) => {
    return (
        <DashboardLayout
            title="Analytics"
            currentPath="/dashboard/analytics"
            user={user}
        >
            <div class="analytics-page">
                {/* Page Header */}
                <div class="analytics-header">
                    <div class="header-content">
                        <h2>📈 Analytics Dashboard</h2>
                        <p class="text-muted">
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
                <section class="analytics-section">
                    <MetricsSummary metrics={data.overview} />
                </section>

                {/* Charts Row */}
                <div class="analytics-grid">
                    {/* Blueprint Metrics Table */}
                    <Card class="analytics-card main">
                        <CardHeader>
                            <h3>📋 Métricas por Blueprint</h3>
                        </CardHeader>
                        <CardBody>
                            <BlueprintMetricsTable blueprints={data.blueprints} />
                        </CardBody>
                    </Card>

                    {/* Bot Status Chart */}
                    <Card class="analytics-card side">
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
                    <Card class="analytics-card insights">
                        <CardHeader>
                            <h3>💡 Insights Rápidos</h3>
                        </CardHeader>
                        <CardBody>
                            <div class="insights-grid">
                                {/* Top Blueprint */}
                                <div class="insight-item">
                                    <span class="insight-icon">🏆</span>
                                    <div class="insight-content">
                                        <span class="insight-label">Blueprint mais usado</span>
                                        <span class="insight-value">
                                            {[...data.blueprints].sort((a: BlueprintMetric, b: BlueprintMetric) => b.flowStarts - a.flowStarts)[0]?.blueprintName || '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Best Conversion */}
                                {data.blueprints.filter((b: BlueprintMetric) => b.flowStarts > 0).length > 0 && (
                                    <div class="insight-item">
                                        <span class="insight-icon">📈</span>
                                        <div class="insight-content">
                                            <span class="insight-label">Melhor conversão</span>
                                            <span class="insight-value">
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
                                <div class="insight-item">
                                    <span class="insight-icon">🟢</span>
                                    <div class="insight-content">
                                        <span class="insight-label">Bots ativos</span>
                                        <span class="insight-value">
                                            {data.overview.activeBots} de {data.overview.totalBots}
                                        </span>
                                    </div>
                                </div>

                                {/* Error Alert */}
                                {data.overview.totalErrors > 0 && (
                                    <div class="insight-item alert">
                                        <span class="insight-icon">⚠️</span>
                                        <div class="insight-content">
                                            <span class="insight-label">Erros detectados</span>
                                            <span class="insight-value">
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
