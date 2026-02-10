/** @jsxImportSource react */
import React from 'react'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'
import { InsightItem } from '../../molecules/analytics/InsightItem'
import type { BlueprintMetric, OverviewMetrics } from '../../../core/analytics-types'

interface QuickInsightsProps {
    overview: OverviewMetrics
    blueprints: BlueprintMetric[]
}

export const QuickInsights: React.FC<QuickInsightsProps> = ({ overview, blueprints }) => {
    if (blueprints.length === 0) return null

    const sortedByUsage = [...blueprints].sort((a, b) => b.flowStarts - a.flowStarts)
    const topBlueprint = sortedByUsage[0]

    const blueprintsWithStarts = blueprints.filter(b => b.flowStarts > 0)
    const sortedByConversion = [...blueprintsWithStarts].sort((a, b) => b.completionRate - a.completionRate)
    const bestConversion = sortedByConversion[0]

    return (
        <Card className="analytics-card insights">
            <CardHeader>
                <h3>💡 Insights Rápidos</h3>
            </CardHeader>
            <CardBody>
                <div className="insights-grid">
                    {/* Top Blueprint */}
                    <InsightItem
                        icon="🏆"
                        label="Blueprint mais usado"
                        value={topBlueprint?.blueprintName || '-'}
                    />

                    {/* Best Conversion */}
                    {bestConversion && (
                        <InsightItem
                            icon="📈"
                            label="Melhor conversão"
                            value={`${bestConversion.blueprintName} (${bestConversion.completionRate}%)`}
                        />
                    )}

                    {/* Active Bots */}
                    <InsightItem
                        icon="🟢"
                        label="Bots ativos"
                        value={`${overview.activeBots} de ${overview.totalBots}`}
                    />

                    {/* Error Alert */}
                    {overview.totalErrors > 0 && (
                        <InsightItem
                            icon="⚠️"
                            label="Erros detectados"
                            value={`${overview.totalErrors} erros registrados`}
                            variant="alert"
                        />
                    )}
                </div>
            </CardBody>
            <style>{`
                .insights-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 16px;
                }
            `}</style>
        </Card>
    )
}
