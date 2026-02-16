/**
 * REGISTRY SETUP (Composition Root)
 * Wires up the Core Registry with Concrete Implementations (Molecules)
 * Follows DIP: High-level modules (Engine) depend on Abstractions (Registry), not Concretions.
 */

import { registerAction } from './action-registry'

// Import Concrete Implementations (Molecules)
import { sendMessage } from './send-message'
import { wait } from '../flow/wait'
import { log } from './log'
import { setVariable } from '../flow/set-variable'
import { condition } from '../flow/condition'
import { collectInput } from '../flow/collect-input'
import { inlineKeyboard } from './inline-keyboard'
import { sendWebApp } from './send-webapp'

// Payment Actions
import { sendPlans } from '../payments/send-plans'
import { selectPlan } from '../payments/select-plan'
import { generatePixAction } from '../payments/generate-pix-action'

// Register Actions to the Core Engine
export function setupRegistry() {
    registerAction('send_message', sendMessage)
    registerAction('wait', wait)
    registerAction('log', log)
    registerAction('set_variable', setVariable)
    registerAction('condition', condition)
    registerAction('collect_input', collectInput)
    registerAction('inline_keyboard', inlineKeyboard)
    registerAction('send_webapp', sendWebApp)

    // Payment Actions
    registerAction('send_plans', sendPlans)
    registerAction('select_plan', selectPlan)
    registerAction('generate_pix', generatePixAction)

    console.log('[Registry] Actions registered successfully.')
}
