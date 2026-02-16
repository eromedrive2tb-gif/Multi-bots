/**
 * ATOM: dc-get-guild
 * Responsabilidade: Retorna informações de um servidor (Guild) do Discord
 * SRP: Apenas faz a chamada à API e retorna dados normalizados
 */

export interface DcGetGuildProps {
    token: string
    guildId: string
}

export interface DcGuildInfo {
    id: string
    name: string
    icon?: string | null
    ownerId?: string
    description?: string | null
}

export interface DcGetGuildResult {
    success: boolean
    guild?: DcGuildInfo
    error?: string
}

export async function dcGetGuild({ token, guildId }: DcGetGuildProps): Promise<DcGetGuildResult> {
    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
            headers: {
                Authorization: `Bot ${token}`,
            },
        })

        if (!response.ok) {
            if (response.status === 404) {
                return {
                    success: false,
                    error: `Servidor não encontrado ou bot não está nele (ID: ${guildId})`,
                }
            }
            if (response.status === 401) {
                return {
                    success: false,
                    error: `Token inválido ou sem permissão`,
                }
            }

            const errorData = await response.json().catch(() => ({})) as any
            return {
                success: false,
                error: errorData.message || `Erro discord: ${response.status}`,
            }
        }

        const data = await response.json() as any

        return {
            success: true,
            guild: {
                id: data.id,
                name: data.name,
                icon: data.icon,
                ownerId: data.owner_id,
                description: data.description
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? `Discord Error: ${error.message}` : 'Erro ao buscar servidor',
        }
    }
}
