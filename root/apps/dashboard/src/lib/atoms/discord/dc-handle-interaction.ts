/**
 * ATOM: dc-handle-interaction
 * Responsabilidade: Processa interactions do Discord (Slash Commands, Buttons)
 * SRP: Apenas processa o payload, não valida assinatura (feito por outro átomo)
 */

import type { GenericMessage, BotProvider } from '../../../core/types'

export enum InteractionType {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}

export interface DiscordInteraction {
    type: InteractionType
    id: string
    token: string
    application_id: string
    data?: {
        id: string
        name: string
        custom_id?: string
        options?: any[]
        values?: string[]
        components?: any[]
    }
    guild_id?: string
    channel_id?: string
    member?: {
        user: {
            id: string
            username: string
            global_name?: string
        }
    }
    user?: {
        id: string
        username: string
        global_name?: string
    }
}

export interface DcHandleInteractionResult {
    type: InteractionType
    isCommand: boolean
    command?: string
    args?: string
    message?: GenericMessage
    customId?: string
}

export function dcHandleInteraction(interaction: DiscordInteraction): DcHandleInteractionResult {
    const user = interaction.member?.user || interaction.user

    if (!user) {
        return { type: interaction.type, isCommand: false }
    }

    // Generic Message Template
    const genericMessage: GenericMessage = {
        id: interaction.id,
        chatId: interaction.channel_id || user.id, // Fallback to user ID if DM
        text: '',
        from: {
            id: user.id,
            name: user.global_name || user.username,
            username: user.username,
        },
        timestamp: new Date(),
        provider: 'discord' as BotProvider,
        raw: interaction,
    }

    // Handle Slash Commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data) {
        const command = interaction.data.name
        // Safety guard for options: check if it's an array before mapping
        const options = Array.isArray(interaction.data.options) ? interaction.data.options : []
        const args = options.map(o => o?.value !== undefined ? String(o.value) : '').join(' ').trim()

        genericMessage.text = `/${command} ${args}`.trim()

        return {
            type: interaction.type,
            isCommand: true,
            command: command,
            args: args,
            message: genericMessage,
        }
    }

    // Handle Buttons / Components
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        const data = interaction.data as any
        let customId = data?.custom_id || data?.customId || (interaction as any).customId || ''

        // Fallback: Scan entire object if not found (Ultra-robust)
        if (!customId) {
            try {
                const raw = JSON.stringify(interaction)
                const match = raw.match(/"custom_id":"([^"]+)"/)
                if (match) {
                    customId = match[1]
                }
            } catch (e) {
                console.warn('[dcHandleInteraction] Failed to scan JSON for custom_id', e)
            }
        }

        genericMessage.text = customId || '' // Treat customId as text for the engine

        return {
            type: interaction.type,
            isCommand: false,
            customId: customId,
            message: genericMessage,
        }
    }

    // Handle Modals (User Input Submission)
    if (interaction.type === InteractionType.MODAL_SUBMIT && interaction.data) {
        // Extract the value from the first text input component
        // Structure: data.components[0].components[0].value
        const rows = interaction.data.components || []
        let inputValue = ''

        for (const row of rows) {
            if (row.components) {
                for (const component of row.components) {
                    if (component.value) {
                        inputValue = component.value
                        break
                    }
                }
            }
            if (inputValue) break
        }

        genericMessage.text = inputValue

        return {
            type: interaction.type,
            isCommand: false,
            customId: interaction.data.custom_id,
            message: genericMessage,
        }
    }

    return {
        type: interaction.type,
        isCommand: false,
        message: interaction.type === InteractionType.PING ? undefined : genericMessage
    }
}
