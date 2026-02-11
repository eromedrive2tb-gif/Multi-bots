import type { UniversalContext, Result } from '../../../core/types'

/**
 * log - Debug logging action (logs to console or external service)
 */
export async function log(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const message = String(params.message ?? '')
    const level = String(params.level ?? 'info')

    console.log(`[${level.toUpperCase()}] [${ctx.tenantId}] [${ctx.provider}:${ctx.userId}] ${message}`)

    return { success: true, data: { logged: true } }
}
