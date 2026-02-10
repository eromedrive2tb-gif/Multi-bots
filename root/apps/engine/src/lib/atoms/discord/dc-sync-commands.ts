/**
 * ATOM: dc-sync-commands
 * Responsabilidade: Sincroniza os triggers (comandos) dos Blueprints com o Discord
 * SRP: Apenas faz a chamada de registro de comandos na API do Discord
 */

export interface DiscordCommand {
    name: string
    description: string
    type?: number // 1 for CHAT_INPUT (Slash Command)
}

export interface DcSyncCommandsProps {
    applicationId: string
    token: string
    commands: DiscordCommand[]
}

export interface DcSyncCommandsResult {
    success: boolean
    error?: string
}

export async function dcSyncCommands({
    applicationId,
    token,
    commands,
}: DcSyncCommandsProps): Promise<DcSyncCommandsResult> {
    try {
        // Registra comandos globais no Discord
        const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(commands),
        })

        if (!response.ok) {
            const errorData = await response.text()
            return {
                success: false,
                error: `Erro ao sincronizar comandos: ${errorData}`,
            }
        }

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao sincronizar comandos',
        }
    }
}
