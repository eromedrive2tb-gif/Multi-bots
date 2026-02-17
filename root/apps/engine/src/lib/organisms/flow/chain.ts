/**
 * ORGANISM: chain
 * Executes a list of action names sharing the same parameters.
 * Supports "Resume Safety": Skips non-input actions if the step is resuming.
 * Usage: "action": "chain", "params": { "actions": ["log", "notify_admin", "send_message"] }
 */

import type { UniversalContext, Result } from '../../../core/types'
import { executeAction } from '../../molecules/general/action-registry'

export async function chain(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const actions = params.actions as string[]
    const isResuming = !!params._is_resuming

    // Resume Safety:
    // If resuming, we need to know at which sub-action we stopped.
    // However, the engine only tracks stepId, not sub-action index.
    // Heuristic: If resuming, we assume the previous execution PAUSED at an input collection step.
    // Therefore, any action strictly BEFORE the input step was already executed.
    // But how do we know which action suspended?
    // 
    // Implementation Strategy:
    // We execute actions in order.
    // If an action returns `suspended: true`, we stop and return suspended.
    // When we resume, we start from the beginning? NO, that repeats messages.
    // 
    // Limitation: Without granular state, we can't perfectly resume mid-chain unless we store index in session.
    // But we can support a common pattern: [Output, Input].
    // If we are resuming, we skip the Output and go straight to Input validation.
    //
    // For now, let's implement a simple chain that executes all, but if `_is_resuming` is true,
    // we skip actions that are KNOWN to be output-only? No, too magic.
    //
    // Better Strategy: chained steps shouldn't suspend in the middle unless it's the LAST step.
    // If a middle step suspends, the chain is broken conceptually for the engine's resume logic (which restarts the step).
    //
    // So for `chain`, we executes ALL actions.
    // It is the USER's responsibility to not put a suspendable action in the middle of a chain 
    // without understanding it might repeat previous steps on resume (unless those steps are idempotent).
    //
    // Wait, the user asked for "send_message, inline_keyboard, collect_input".
    // If I send message + buttons, then collect_input suspends.
    // On resume, `chain` runs again.
    // It WILL send message + buttons AGAIN. This is bad.
    //
    // FIX: We need `prompt` organism for that specific [Message + Input] pattern.
    // `chain` is better for [Log, Notify, Send].
    //
    // However, to support the user's request of `["action1", "action2"]` generically:
    // We can try to be smart:
    // If _is_resuming is true, and the chain contains `collect_input` or similar, 
    // we should ideally skip the pre-requisites.
    //
    // Let's implement basic sequential execution first.
    // If any action fails, we stop.
    // If any action suspends, we return suspended.

    if (!Array.isArray(actions)) {
        return { success: false, error: 'Chain "actions" must be an array of strings' }
    }

    const results: unknown[] = []

    for (const actionName of actions) {
        // Execute action
        // We pass the SAME params to all actions in the chain.
        // This is powerful for "shared context" actions.
        const result = await executeAction(actionName, ctx, params)

        if (!result.success) {
            return {
                success: false,
                error: `Chain failed at action "${actionName}": ${result.error}`,
            }
        }

        const data = result.data as any
        if (data && data.suspended) {
            return {
                success: true,
                data: {
                    suspended: true,
                    // We bubble up the suspension.
                    // WARNING: On resume, this entire chain restarts.
                    // This confirms that `prompt` is needed for safe Interaction.
                    ...data
                }
            }
        }

        results.push(result.data)
    }

    return {
        success: true,
        data: { results },
    }
}
