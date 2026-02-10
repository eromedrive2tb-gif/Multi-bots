/**
 * ATOM: dc-send-message
 * Responsabilidade: Envia uma mensagem em um canal Discord
 * SRP: Apenas envia mensagem, não faz log, não valida
 */

export interface DcSendMessageProps {
    token: string
    channelId: string
    content: string
    embed?: {
        title?: string
        description?: string
        color?: number
    }
}

export interface DcSendMessageResult {
    success: boolean
    messageId?: string
    error?: string
}

export async function dcSendMessage({
    token,
    channelId,
    content,
    embed,
}: DcSendMessageProps): Promise<DcSendMessageResult> {
    try {
        const body: Record<string, unknown> = { content }

        if (embed) {
            body.embeds = [embed]
        }

        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const error = await response.text()
            return {
                success: false,
                error: `Erro ao enviar mensagem: ${error}`,
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
            error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        }
    }
}
