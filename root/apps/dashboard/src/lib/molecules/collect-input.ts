import type { UniversalContext, Result } from '../../core/types'
import { sendMessage } from './send-message'

export async function collectInput(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const variable = String(params.variable || 'input')
    const validation = String(params.validation || 'any')
    const timeoutSeconds = Number(params.timeout_seconds || 60)
    const promptOnInvalid = String(params.prompt_on_invalid || 'Inválido, tente novamente.')

    // We need to access session state to know if we are already waiting
    // But molecules are stateless functions...
    // The engine injects 'session' into params if we use {{session.xxx}}, but here we need internal state management.
    // However, the Context (UniversalContext) doesn't have the session state directly unless we pass it.

    // WORKAROUND: The engine must inject the current step ID or "waiting" status into the context or params?
    // Actually, in our engine architecture, we can check if the current input matches the EXPECTED input for this step.

    // But `collectInput` is called *after* the user sent a message.
    // If the engine loop just arrived here, it means we need to SUSPEND.

    // How do we distinguish "just arrived" vs "message received for this step"?
    // We can use a special property in ctx called `_resuming`?
    // OR we check if `session.currentStepId` == THIS_STEP_ID.

    // Let's assume the engine handles the "wait" logic by checking the return value.
    // If we return { suspended: true }, the engine stops and saves the step.
    // NEXT time the engine runs for this user, if the currentStepId matches this step, 
    // it means we are RESUMING.

    // BUT `collectInput` function doesn't know if it's being called for the first time or resuming
    // UNLESS we check the input.

    // If `lastInput` exists, is it the input we want?
    // If the flow was triggered by a command, `lastInput` is "/start".

    // We can use a convention:
    // If it's resuming, the Engine should pass a flag.
    // OR we inspect `ctx.metadata.lastInput`.

    // Let's implement this logic:
    // 1. If we are just Arriving (how to know?), we suspend.
    // 2. If we are Resuming, we validate `lastInput`.

    // PROBLEM: Stateless functions don't know "just arriving".
    // SOLUTION: The engine orchestrates this.
    // But `collectInput` is just an action.

    // ALTERNATIVE:
    // `collectInput` ALWAYS checks `lastInput`.
    // But if `lastInput` was the trigger command, we shouldn't consume it.

    // Let's assume the engine will handle the "is this new input?" logic? No, engine is generic.

    // Let's rely on a special param injected by the engine: `_is_resuming`.
    // If not present, we assume first run -> Suspend.

    const isResuming = !!params._is_resuming

    if (!isResuming) {
        // First time reaching this step.
        // We might want to send a prompt?
        // Usually prompt is sent by previous step.

        // Return suspended state
        return {
            success: true,
            data: {
                suspended: true,
                wait_for_input: true
            }
        }
    }

    // We are resuming, validate input
    const input = ctx.metadata.lastInput || ''

    let isValid = true

    if (validation === 'email') {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
    } else if (validation === 'phone') {
        isValid = /^\d{10,11}$/.test(input.replace(/\D/g, ''))
    }

    if (!isValid) {
        // Return error/prompt but typically we might want to stay on this step?
        // If we return success:false, error: 'invalid', engine goes to on_error.
        // If blueprint has retry logic?

        if (promptOnInvalid) {
            // Invalid input: Send prompt and suspend again (retry)
            await sendMessage(ctx, {
                text: promptOnInvalid,
                parse_mode: 'HTML' // Assume HTML for flexibility
            })

            return {
                success: true,
                data: {
                    suspended: true,
                    wait_for_input: true,
                    validation_failed: true
                }
            }
        } else {
            // No prompt defined, fatal error
            return {
                success: false,
                error: `Input validation failed: ${validation}`
            }
        }
    }

    // Valid input!
    return {
        success: true,
        data: {
            [variable]: input,
            suspended: false // Proceed to next step
        }
    }
}
