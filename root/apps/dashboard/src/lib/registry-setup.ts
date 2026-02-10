/**
 * REGISTRY SETUP (Composition Root)
 * Wires up the Core Registry with Concrete Implementations (Molecules)
 * Follows DIP: High-level modules (Engine) depend on Abstractions (Registry), not Concretions.
 */

import { registerAction } from './molecules/action-registry'

// Import Concrete Implementations (Molecules)
import { sendMessage } from './molecules/send-message'
import { wait } from './molecules/wait'
import { log } from './molecules/log'
import { setVariable } from './molecules/set-variable'
import { condition } from './molecules/condition'
import { collectInput } from './molecules/collect-input'
import { inlineKeyboard } from './molecules/inline-keyboard'

// Register Actions to the Core Engine
export function setupRegistry() {
    registerAction('send_message', sendMessage)
    registerAction('wait', wait)
    registerAction('log', log)
    registerAction('set_variable', setVariable)
    registerAction('condition', condition)
    registerAction('collect_input', collectInput)
    registerAction('inline_keyboard', inlineKeyboard)

    console.log('[Registry] Actions registered successfully.')
}
