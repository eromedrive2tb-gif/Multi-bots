import { BotError } from '../../../core/types'

interface DiscordMember {
    user: {
        id: string
        username: string
        discriminator: string
        avatar?: string
        bot?: boolean
    }
    nick?: string
    roles: string[]
    joined_at: string
}

interface DcGetGuildMembersParams {
    token: string
    guildId: string
    limit?: number
}

interface DcGetGuildMembersResult {
    success: boolean
    members?: DiscordMember[]
    error?: string
}

export async function dcGetGuildMembers({ token, guildId, limit = 1000 }: DcGetGuildMembersParams): Promise<DcGetGuildMembersResult> {
    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=${limit}`, {
            headers: {
                Authorization: `Bot ${token}`,
            },
        })

        if (!response.ok) {
            const errorData = await response.json() as any
            console.error('[Discord] Error fetching guild members:', errorData)
            return { success: false, error: errorData.message || 'Error fetching members' }
        }

        const members = await response.json() as DiscordMember[]
        return { success: true, members }
    } catch (error) {
        console.error('[Discord] Network error fetching guild members:', error)
        return { success: false, error: 'Network error' }
    }
}
