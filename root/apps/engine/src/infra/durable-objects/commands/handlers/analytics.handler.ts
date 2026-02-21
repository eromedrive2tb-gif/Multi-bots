/**
 * COMMAND HANDLER: Analytics
 * Actions: FETCH_ANALYTICS, CLEAR_ANALYTICS
 */

import type { Env } from '../../../../core/types'
import type { CommandHandler, CommandResult } from '../command-registry'
import { AnalyticsService } from '../../../../lib/organisms/analytics/AnalyticsService'

export const fetchAnalytics: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new AnalyticsService(env.DB, meta.tenantId)
    const result = await service.getDashboard(payload || {})
    return {
        success: result.success,
        data: result.success ? result.data : undefined,
        error: !result.success ? result.error : undefined
    }
}

export const clearAnalytics: CommandHandler = async (env, payload, meta): Promise<CommandResult> => {
    const service = new AnalyticsService(env.DB, meta.tenantId)
    const result = await service.clearMetrics()
    return {
        success: result.success,
        error: result.success ? undefined : result.error
    }
}
