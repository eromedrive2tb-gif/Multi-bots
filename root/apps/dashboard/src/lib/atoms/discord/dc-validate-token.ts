/**
 * ATOM: dc-validate-token
 * Responsabilidade: Valida credenciais Discord e retorna informações da aplicação
 * SRP: Apenas faz validação, não salva, não configura
 */

import type { BotInfo } from '../../../core/types'

export interface DcValidateTokenProps {
    applicationId: string
    publicKey: string
    token: string
}

export interface DcValidateTokenResult {
    success: boolean
    botInfo?: BotInfo
    error?: string
}

export async function dcValidateToken({
    applicationId,
    token,
}: DcValidateTokenProps): Promise<DcValidateTokenResult> {
    try {
        // Valida o token fazendo uma chamada à API do Discord
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bot ${token}`,
            },
        })

        if (!response.ok) {
            return {
                success: false,
                error: `Token inválido: ${response.status}`,
            }
        }

        const data = await response.json() as { id: string; username: string; global_name?: string }

        // Verifica se o application ID corresponde
        if (data.id !== applicationId) {
            return {
                success: false,
                error: 'Application ID não corresponde ao token',
            }
        }

        return {
            success: true,
            botInfo: {
                id: data.id,
                username: data.username,
                name: data.global_name || data.username,
                isValid: true,
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao validar credenciais',
        }
    }
}
