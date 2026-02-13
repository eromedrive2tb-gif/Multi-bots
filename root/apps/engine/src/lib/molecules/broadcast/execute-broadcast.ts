/**
 * MOLECULE: execute-broadcast
 * Orquestra envio de broadcast para lista de usuários
 * Implementa rate limiting para evitar flood no Telegram/Discord
 */

import type { UniversalContext, Result } from '../../../core/types'
import type { BroadcastContent } from '../../../core/broadcast-types'
import { sendMessage } from '../general/send-message'
import { dbGetCustomers } from '../../atoms/database/db-get-customers'

const RATE_LIMIT_MS = 50 // 20 msgs/sec para Telegram

export interface ExecuteBroadcastProps {
    db: D1Database
    tenantId: string
    botId: string
    botToken: string
    provider: 'tg' | 'dc'
    content: BroadcastContent
    targetType: 'channel' | 'group' | 'users'
    targetId?: string // channel/group ID
}

export interface BroadcastResult {
    totalRecipients: number
    deliveredCount: number
    failedCount: number
}

export async function executeBroadcast(
    props: ExecuteBroadcastProps
): Promise<Result<BroadcastResult>> {
    try {
        let recipients: string[] = []

        if (props.targetType === 'users') {
            // Buscar todos os clientes do tenant vinculados ao bot
            const customersResult = await dbGetCustomers({
                db: props.db,
                tenantId: props.tenantId,
                limit: 10000,
                offset: 0,
            })
            if (customersResult.success) {
                recipients = (customersResult.data.data || [])
                    .filter((c: any) => c.externalId)
                    .map((c: any) => c.externalId)
            }
        } else {
            // Enviar para channel ou group
            recipients = [props.targetId || '']
        }

        if (recipients.length === 0) {
            return { success: false, error: 'Nenhum destinatário encontrado' }
        }

        let deliveredCount = 0
        let failedCount = 0

        for (const chatId of recipients) {
            try {
                const ctx: UniversalContext = {
                    tenantId: props.tenantId,
                    provider: props.provider,
                    botId: props.botId,
                    botToken: props.botToken,
                    chatId,
                    userId: chatId,
                    metadata: {},
                }

                const result = await sendMessage(ctx, {
                    text: props.content.text,
                    parseMode: props.content.parseMode || 'HTML',
                })

                if (result.success) {
                    deliveredCount++
                } else {
                    failedCount++
                }

                // Rate limiting
                if (RATE_LIMIT_MS > 0) {
                    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
                }
            } catch {
                failedCount++
            }
        }

        return {
            success: true,
            data: {
                totalRecipients: recipients.length,
                deliveredCount,
                failedCount,
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro no broadcast',
        }
    }
}
