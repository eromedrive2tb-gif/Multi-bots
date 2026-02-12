
/**
 * ATOM: dc-send-link-button
 * Responsabilidade: Envia uma mensagem com um botão de link no Discord
 */

export interface DcSendLinkButtonProps {
    token: string
    channelId: string
    text: string
    buttonText: string
    url: string
}

export interface DcSendLinkButtonResult {
    success: boolean
    messageId?: string
    error?: string
}

export async function dcSendLinkButton({
    token,
    channelId,
    text,
    buttonText,
    url,
}: DcSendLinkButtonProps): Promise<DcSendLinkButtonResult> {
    try {
        const component = {
            type: 1, // Action Row
            components: [
                {
                    type: 2, // Button
                    style: 5, // Link style
                    label: buttonText,
                    url: url,
                },
            ],
        }

        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: text,
                components: [component],
            }),
        })

        if (!response.ok) {
            const errorData = await response.text()
            return {
                success: false,
                error: `Erro ao enviar link no Discord: ${errorData}`,
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
            error: error instanceof Error ? error.message : 'Erro ao enviar link no Discord',
        }
    }
}
