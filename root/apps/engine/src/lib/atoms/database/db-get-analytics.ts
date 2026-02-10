/**
 * ATOM: db-get-analytics
 * Responsabilidade: Consultas de analytics agregadas no banco D1
 * Proibido: Importar outros atoms, molecules ou organisms
 */

import type { Result } from '../../../core/types'
import type {
    OverviewMetrics,
    BlueprintMetric,
    BotMetric,
    StepMetric,
    AnalyticsFilterParams
} from '../../../core/analytics-types'

// ============================================
// OVERVIEW METRICS
// ============================================

export async function dbGetOverviewMetrics(
    db: D1Database,
    tenantId: string,
    filters?: AnalyticsFilterParams
): Promise<Result<OverviewMetrics>> {
    try {
        // Build date filter
        const dateFilter = filters?.dateFrom && filters?.dateTo
            ? `AND created_at BETWEEN '${filters.dateFrom}' AND '${filters.dateTo}'`
            : ''

        // Count bots
        const botsResult = await db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as active
            FROM bots WHERE tenant_id = ?
        `).bind(tenantId).first<{ total: number; active: number }>()

        // Count blueprints
        const blueprintsResult = await db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
            FROM blueprints WHERE tenant_id = ?
        `).bind(tenantId).first<{ total: number; active: number }>()

        // Flow starts and completions
        const flowsResult = await db.prepare(`
            SELECT 
                SUM(CASE WHEN event_type = 'flow_start' THEN 1 ELSE 0 END) as starts,
                SUM(CASE WHEN event_type = 'flow_complete' THEN 1 ELSE 0 END) as completions,
                SUM(CASE WHEN event_type = 'step_error' THEN 1 ELSE 0 END) as errors
            FROM analytics_events 
            WHERE tenant_id = ? ${dateFilter}
        `).bind(tenantId).first<{ starts: number; completions: number; errors: number }>()

        const starts = flowsResult?.starts ?? 0
        const completions = flowsResult?.completions ?? 0

        return {
            success: true,
            data: {
                totalBots: botsResult?.total ?? 0,
                activeBots: botsResult?.active ?? 0,
                totalBlueprints: blueprintsResult?.total ?? 0,
                activeBlueprints: blueprintsResult?.active ?? 0,
                totalFlowStarts: starts,
                totalFlowCompletions: completions,
                completionRate: starts > 0 ? Math.round((completions / starts) * 100) : 0,
                totalErrors: flowsResult?.errors ?? 0,
            }
        }
    } catch (error) {
        return { success: false, error: `Failed to get overview metrics: ${error}` }
    }
}

// ============================================
// BLUEPRINT METRICS
// ============================================

export async function dbGetBlueprintMetrics(
    db: D1Database,
    tenantId: string,
    filters?: AnalyticsFilterParams
): Promise<Result<BlueprintMetric[]>> {
    try {
        const dateFilter = filters?.dateFrom && filters?.dateTo
            ? `AND a.created_at BETWEEN '${filters.dateFrom}' AND '${filters.dateTo}'`
            : ''

        const statusFilter = filters?.status === 'active' ? 'AND b.is_active = 1'
            : filters?.status === 'inactive' ? 'AND b.is_active = 0' : ''

        const results = await db.prepare(`
            SELECT 
                b.id as blueprint_id,
                b.name as blueprint_name,
                b.trigger,
                b.is_active,
                COALESCE(SUM(CASE WHEN a.event_type = 'flow_start' THEN 1 ELSE 0 END), 0) as flow_starts,
                COALESCE(SUM(CASE WHEN a.event_type = 'flow_complete' THEN 1 ELSE 0 END), 0) as flow_completions,
                COALESCE(SUM(CASE WHEN a.event_type = 'step_error' THEN 1 ELSE 0 END), 0) as total_errors
            FROM blueprints b
            LEFT JOIN analytics_events a ON b.id = a.blueprint_id AND a.tenant_id = ? ${dateFilter}
            WHERE b.tenant_id = ? ${statusFilter}
            GROUP BY b.id, b.name, b.trigger, b.is_active
            ORDER BY flow_starts DESC
        `).bind(tenantId, tenantId).all<{
            blueprint_id: string
            blueprint_name: string
            trigger: string
            is_active: number
            flow_starts: number
            flow_completions: number
            total_errors: number
        }>()

        const metrics: BlueprintMetric[] = (results.results ?? []).map(row => ({
            blueprintId: row.blueprint_id,
            blueprintName: row.blueprint_name || row.blueprint_id,
            trigger: row.trigger,
            isActive: row.is_active === 1,
            flowStarts: row.flow_starts,
            flowCompletions: row.flow_completions,
            completionRate: row.flow_starts > 0
                ? Math.round((row.flow_completions / row.flow_starts) * 100)
                : 0,
            avgStepsCompleted: 0, // TODO: Calculate from step_complete events
            totalErrors: row.total_errors,
        }))

        return { success: true, data: metrics }
    } catch (error) {
        return { success: false, error: `Failed to get blueprint metrics: ${error}` }
    }
}

// ============================================
// BOT METRICS
// ============================================

export async function dbGetBotMetrics(
    db: D1Database,
    tenantId: string,
    filters?: AnalyticsFilterParams
): Promise<Result<BotMetric[]>> {
    try {
        const dateFilter = filters?.dateFrom && filters?.dateTo
            ? `AND a.created_at BETWEEN '${filters.dateFrom}' AND '${filters.dateTo}'`
            : ''

        const results = await db.prepare(`
            SELECT 
                b.id as bot_id,
                b.name as bot_name,
                b.provider,
                b.status,
                COUNT(DISTINCT a.blueprint_id) as total_flows,
                COUNT(DISTINCT a.user_id) as total_users,
                MAX(a.created_at) as last_activity
            FROM bots b
            LEFT JOIN analytics_events a ON b.id = a.bot_id AND a.tenant_id = ? ${dateFilter}
            WHERE b.tenant_id = ?
            GROUP BY b.id, b.name, b.provider, b.status
            ORDER BY total_flows DESC
        `).bind(tenantId, tenantId).all<{
            bot_id: string
            bot_name: string
            provider: 'telegram' | 'discord'
            status: 'online' | 'offline' | 'error'
            total_flows: number
            total_users: number
            last_activity: string | null
        }>()

        const metrics: BotMetric[] = (results.results ?? []).map(row => ({
            botId: row.bot_id,
            botName: row.bot_name,
            provider: row.provider,
            status: row.status,
            totalFlows: row.total_flows,
            totalUsers: row.total_users,
            lastActivity: row.last_activity ? new Date(row.last_activity) : undefined,
        }))

        return { success: true, data: metrics }
    } catch (error) {
        return { success: false, error: `Failed to get bot metrics: ${error}` }
    }
}

// ============================================
// STEP METRICS (for funnel analysis)
// ============================================

export async function dbGetStepMetrics(
    db: D1Database,
    tenantId: string,
    blueprintId: string,
    filters?: AnalyticsFilterParams
): Promise<Result<StepMetric[]>> {
    try {
        const dateFilter = filters?.dateFrom && filters?.dateTo
            ? `AND created_at BETWEEN '${filters.dateFrom}' AND '${filters.dateTo}'`
            : ''

        const results = await db.prepare(`
            SELECT 
                step_id,
                SUM(CASE WHEN event_type = 'step_enter' THEN 1 ELSE 0 END) as entrances,
                SUM(CASE WHEN event_type = 'step_complete' THEN 1 ELSE 0 END) as completions,
                SUM(CASE WHEN event_type = 'step_error' THEN 1 ELSE 0 END) as errors
            FROM analytics_events 
            WHERE tenant_id = ? AND blueprint_id = ? ${dateFilter}
            GROUP BY step_id
            ORDER BY entrances DESC
        `).bind(tenantId, blueprintId).all<{
            step_id: string
            entrances: number
            completions: number
            errors: number
        }>()

        const metrics: StepMetric[] = (results.results ?? []).map(row => ({
            stepId: row.step_id,
            stepType: 'molecule' as const, // TODO: Get from blueprint
            action: row.step_id, // TODO: Get from blueprint
            entranceCount: row.entrances,
            completionCount: row.completions,
            errorCount: row.errors,
            dropoffRate: row.entrances > 0
                ? Math.round(((row.entrances - row.completions) / row.entrances) * 100)
                : 0,
        }))

        return { success: true, data: metrics }
    } catch (error) {
        return { success: false, error: `Failed to get step metrics: ${error}` }
    }
}
