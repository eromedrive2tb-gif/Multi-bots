import type { UniversalContext, Result } from '../../core/types'
import { sendMessage } from './send-message'

import { dcSendButtons } from '../atoms/discord/dc-send-buttons'

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

    const lastInput = ctx.metadata.lastInput
    const isTrigger = !!ctx.metadata.command
    const hasInput = lastInput !== undefined && lastInput !== null && lastInput !== ''

    // We are resuming if:
    // 1. Explicitly flagged by the engine (we were suspended on this step)
    // 2. DO NOT use hasInput here blindly, or we loop consuming the same input for multiple steps.
    const isResuming = !!params._is_resuming

    if (!isResuming) {
        // First time reaching this step.

        // DISCORD SPECIFIC: Webhook bots cannot receive text messages.
        // We must send a button to trigger a Modal for input collection.
        if (ctx.provider === 'dc') {
            await dcSendButtons({
                token: ctx.botToken,
                channelId: ctx.chatId,
                text: 'Clique abaixo para responder:',
                buttons: [[{
                    text: '📝 Responder',
                    custom_id: `CIV_${variable}`, // Collect Input Value
                    style: 1 // Primary
                }]]
            })
        }

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
