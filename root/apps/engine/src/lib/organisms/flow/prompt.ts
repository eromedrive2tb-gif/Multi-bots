/**
 * ORGANISM: prompt
 * The "God Molecule" for Interaction.
 * Combines "Output" (Text/Image/Buttons) + "Input" (Collect) in a single step.
 * 
 * Logic:
 * 1. If NOT resuming:
 *    - Send Interactive Message (Text/Image/Buttons)
 *    - Call collect_input (which sets suspended=true)
 * 
 * 2. If resuming (User replied):
 *    - SKIP sending message (Resume Safety)
 *    - Call collect_input (which validates input and returns success)
 */

import type { UniversalContext, Result } from '../../../core/types'
import { interactiveMessage } from '../general/interactive-message'
import { collectInput } from '../../molecules/flow/collect-input'

export async function promptAction(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const isResuming = !!params._is_resuming

    // STEP 1: Output (Only if not resuming)
    if (!isResuming) {
        const outputResult = await interactiveMessage(ctx, params)
        if (!outputResult.success) {
            return outputResult
        }
    }

    // STEP 2: Input Collection
    // collectInput handles its own resuming logic (validation vs setup)
    // We pass all params through, so it can see 'validation', 'variable', etc.
    const inputResult = await collectInput(ctx, params)

    // STEP 3: Integrated Branching (New Feature)
    // If input was successful and not suspended, check for branches
    if (isResuming && inputResult.success && inputResult.data && !(inputResult.data as any).suspended) {
        const branches = params.branches as Record<string, string> | undefined
        if (branches) {
            const variable = String(params.variable || 'input')
            const userInput = (inputResult.data as any)[variable]

            if (userInput && branches[userInput]) {
                // Inject the dynamic next_step into the result data for the engine to follow
                return {
                    ...inputResult,
                    data: {
                        ...(inputResult.data as object),
                        next_step: branches[userInput]
                    }
                }
            }
        }
    }

    return inputResult
}


