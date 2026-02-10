import type { UniversalContext, Result } from '../../core/types'

export async function setVariable(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const variable = String(params.variable)
    const value = params.value

    return {
        success: true,
        data: {
            [variable]: value
        }
    }
}
