/**
 * MOLECULE: analytics-aggregator
 * Responsabilidade: Orquestra atoms de analytics para criar métricas agregadas
 * Permitido: Importar e orquestrar átomos
 */

import {
    dbGetOverviewMetrics,
    dbGetBlueprintMetrics,
    dbGetBotMetrics,
    dbGetStepMetrics
} from '../../atoms'
import type { Result } from '../../../core/types'
import type {
    OverviewMetrics,
    BlueprintMetric,
    BotMetric,
    StepMetric,
    AnalyticsFilterParams,
    FunnelData
} from '../../../core/analytics-types'

// ============================================
// FULL DASHBOARD DATA
// ============================================

export interface AnalyticsDashboardData {
    overview: OverviewMetrics
    blueprints: BlueprintMetric[]
    bots: BotMetric[]
}

/**
 * Busca todos os dados necessários para o dashboard de analytics
 */
export async function getAnalyticsDashboard(
    db: D1Database,
    tenantId: string,
    filters?: AnalyticsFilterParams
): Promise<Result<AnalyticsDashboardData>> {
    // Execute queries in parallel for performance
    const [overviewResult, blueprintsResult, botsResult] = await Promise.all([
        dbGetOverviewMetrics(db, tenantId, filters),
        dbGetBlueprintMetrics(db, tenantId, filters),
        dbGetBotMetrics(db, tenantId, filters),
    ])

    if (!overviewResult.success) return overviewResult
    if (!blueprintsResult.success) return blueprintsResult
    if (!botsResult.success) return botsResult

    return {
        success: true,
        data: {
            overview: overviewResult.data,
            blueprints: blueprintsResult.data,
            bots: botsResult.data,
        }
    }
}

// ============================================
// FUNNEL ANALYSIS
// ============================================

/**
 * Gera dados de funil para um blueprint específico
 */
export async function getBlueprintFunnel(
    db: D1Database,
    tenantId: string,
    blueprintId: string,
    filters?: AnalyticsFilterParams
): Promise<Result<FunnelData>> {
    const stepsResult = await dbGetStepMetrics(db, tenantId, blueprintId, filters)

    if (!stepsResult.success) return stepsResult

    const steps = stepsResult.data
    const maxCount = steps.length > 0 ? Math.max(...steps.map(s => s.entranceCount)) : 0

    return {
        success: true,
        data: {
            blueprintId,
            blueprintName: blueprintId, // TODO: Get from blueprint
            steps: steps.map(step => ({
                stepId: step.stepId,
                label: step.stepId,
                count: step.entranceCount,
                percentage: maxCount > 0 ? Math.round((step.entranceCount / maxCount) * 100) : 0,
            }))
        }
    }
}

// ============================================
// TOP METRICS
// ============================================

/**
 * Retorna os top N blueprints por número de execuções
 */
export function getTopBlueprints(blueprints: BlueprintMetric[], limit = 5): BlueprintMetric[] {
    return [...blueprints]
        .sort((a, b) => b.flowStarts - a.flowStarts)
        .slice(0, limit)
}

/**
 * Retorna blueprints com maior taxa de abandono
 */
export function getHighDropoffBlueprints(blueprints: BlueprintMetric[], limit = 5): BlueprintMetric[] {
    return [...blueprints]
        .filter(b => b.flowStarts > 0)
        .sort((a, b) => (100 - a.completionRate) - (100 - b.completionRate))
        .slice(0, limit)
}
