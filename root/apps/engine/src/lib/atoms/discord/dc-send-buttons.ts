/**
 * ATOM: dc-send-buttons
 * Responsabilidade: Envia uma mensagem com botões no Discord
 */

export interface DcSendButtonsProps {
    token: string
    channelId: string
    text: string
    buttons: Array<Array<{ text: string; custom_id: string; style?: number }>>
}

export interface DcSendButtonsResult {
    success: boolean
    messageId?: string
    error?: string
}

export async function dcSendButtons({
    token,
    channelId,
    text,
    buttons,
}: DcSendButtonsProps): Promise<DcSendButtonsResult> {
    try {
        const components = buttons.map(row => ({
            type: 1, // Action Row
            components: row.map(btn => ({
                type: 2, // Button
                label: btn.text,
                style: btn.style || 1, // Default to Primary (blue)
                custom_id: btn.custom_id,
            })),
        }))

        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: text,
                components,
            }),
        })

        if (!response.ok) {
            const errorData = await response.text()
            return {
                success: false,
                error: `Erro ao enviar botões no Discord: ${errorData}`,
            }
        }

        const data = await response.json() as { id: string }

        return {
            success: true,
            messageId: data.id,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao enviar botões no Discord',
        }
    }
}
