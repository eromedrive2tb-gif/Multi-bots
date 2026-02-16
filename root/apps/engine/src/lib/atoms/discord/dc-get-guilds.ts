/**
 * ATOM: dc-get-guilds
 * Responsabilidade: Retorna a lista de servidores (Guilds) que o bot faz parte
 */

export interface DcGetGuildsProps {
    token: string
}

export interface DcGuildInfo {
    id: string
    name: string
    icon: string | null
    owner: boolean
    permissions: string
}

export interface DcGetGuildsResult {
    success: boolean
    guilds?: DcGuildInfo[]
    error?: string
}

export async function dcGetGuilds({ token }: DcGetGuildsProps): Promise<DcGetGuildsResult> {
    try {
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                Authorization: `Bot ${token}`,
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as any
            return {
                success: false,
                error: errorData.message || `Erro discord: ${response.status}`,
            }
        }

        const data = await response.json() as DcGuildInfo[]

        return {
            success: true,
            guilds: data.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.icon,
                owner: g.owner,
                permissions: g.permissions
            }))
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? `Discord Error: ${error.message}` : 'Erro ao buscar servidores',
        }
    }
}
