/**
 * MOLECULE: generate-pix-action
 * Blueprint action: Gera PIX dentro de um fluxo de bot
 * Usado como step type "generate_pix" no JSON Blueprint
 */

import type { UniversalContext, Result } from '../../../core/types'
import { processCheckout } from './process-checkout'

export async function generatePixAction(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const planId = params.plan_id as string | undefined
    const planVar = params.plan_var as string | undefined
    const amount = params.amount as number | undefined
    const description = params.description as string | undefined
    const gatewayId = params.gateway_id as string | undefined

    // Resolve plan_var from session data (ex: {{selected_plan}})
    const resolvedPlanId = planVar || planId

    return await processCheckout(ctx, {
        planId: resolvedPlanId,
        gatewayId,
        amount,
        description,
        expirationMinutes: (params.expiration_minutes as number) || 30,
        message: params.message as string | undefined,
    })
}
