import type { UniversalContext, Result } from '../../../core/types'

/**
 * wait - Delays execution (useful for flow pacing)
 */
export async function wait(
    _ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const ms = Number(params.ms ?? params.milliseconds ?? 1000)

    // Edge-safe delay using scheduler or promise
    await new Promise(resolve => setTimeout(resolve, Math.min(ms, 10000)))

    return { success: true, data: { waited: ms } }
}
