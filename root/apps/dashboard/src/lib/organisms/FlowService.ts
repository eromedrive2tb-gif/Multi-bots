/**
 * ORGANISM: FlowService
 * Responsabilidade: Execução de fluxos e gerenciamento de contexto
 * Orquestra: Engine e Contexto
 */

import type { UniversalContext } from '../../core/types'
import { executeFromTrigger } from '../../core/engine'

export class FlowService {
    constructor(
        private env: { BLUEPRINTS_KV: KVNamespace; SESSIONS_KV: KVNamespace },
        private tenantId: string
    ) { }

    /**
     * Executa um fluxo a partir de um gatilho manualmente (debug)
     */
    async debugTrigger(trigger: string, userId: string, userName: string) {
        // Build mock UniversalContext
        const ctx: UniversalContext = {
            provider: 'tg',
            tenantId: this.tenantId,
            userId,
            chatId: userId,
            botToken: 'debug_token',
            botId: 'debug_bot_id',
            metadata: {
                userName,
                lastInput: trigger,
                command: trigger.startsWith('/') ? trigger.slice(1) : undefined,
            },
        }

        console.log('[DEBUG] Testing trigger:', trigger, 'for tenant:', this.tenantId)

        // Execute flow
        const result = await executeFromTrigger(
            {
                blueprints: this.env.BLUEPRINTS_KV,
                sessions: this.env.SESSIONS_KV,
            },
            ctx
        )

        return result
    }
}
