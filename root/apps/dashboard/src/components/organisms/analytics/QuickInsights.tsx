/** @jsxImportSource react */
/** @jsxImportSource react */
import React from 'react'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'
import { InsightItem } from '../../molecules/analytics/InsightItem'
import { Lightbulb, Trophy, TrendingUp, Activity, AlertTriangle } from 'lucide-react'
import type { BlueprintMetric, OverviewMetrics } from '../../../../../engine/src/core/analytics-types'

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
                <h3 className="flex items-center gap-2"><Lightbulb size={18} className="text-warning" /> Insights Rápidos</h3>
            </CardHeader>
            <CardBody>
                <div className="insights-grid">
                    {/* Top Blueprint */}
                    <InsightItem
                        icon={<Trophy size={16} className="text-warning" />}
                        label="Blueprint mais usado"
                        value={topBlueprint?.blueprintName || '-'}
                    />

                    {/* Best Conversion */}
                    {bestConversion && (
                        <InsightItem
                            icon={<TrendingUp size={16} className="text-emerald-400" />}
                            label="Melhor conversão"
                            value={`${bestConversion.blueprintName} (${bestConversion.completionRate}%)`}
                        />
                    )}

                    {/* Active Bots */}
                    <InsightItem
                        icon={<Activity size={16} className="text-cyan-400" />}
                        label="Bots ativos"
                        value={`${overview.activeBots} de ${overview.totalBots}`}
                    />

                    {/* Error Alert */}
                    {overview.totalErrors > 0 && (
                        <InsightItem
                            icon={<AlertTriangle size={16} className="text-rose-400" />}
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
