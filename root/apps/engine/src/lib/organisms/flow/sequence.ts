/**
 * ORGANISM: sequence
 * Executes a list of steps systematically
 * Solves "multiple molecules in a single step"
 */

import type { UniversalContext, Result } from '../../../core/types'
import { executeAction } from '../../molecules/general/action-registry'

interface SequenceStep {
    action: string
    params: Record<string, unknown>
    // optional delay after step (ms)
    delay?: number
}

export async function sequence(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const steps = params.steps as SequenceStep[]

    if (!Array.isArray(steps)) {
        return { success: false, error: 'Sequence "steps" must be an array' }
    }

    const results: unknown[] = []

    for (const step of steps) {
        // Execute action
        const result = await executeAction(step.action, ctx, step.params)

        if (!result.success) {
            // Stop sequence on failure? Or continue?
            // Usually strict sequence stops.
            return {
                success: false,
                error: `Sequence failed at action "${step.action}": ${result.error}`,
            }
        }

        results.push(result.data)

        // Handle logical delay
        if (step.delay && step.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, step.delay))
        }
    }

    return {
        success: true,
        data: { results },
    }
}
