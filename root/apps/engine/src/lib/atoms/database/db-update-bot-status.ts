/**
 * ATOM: db-update-bot-status
 * Responsabilidade: Atualiza o status de um bot
 * SRP: Apenas atualiza status, não valida, não notifica
 */

import type { BotStatus } from '../../../core/types'

export interface DbUpdateBotStatusProps {
    db: D1Database
    id: string
    status: BotStatus
    statusMessage?: string
}

export async function dbUpdateBotStatus({
    db,
    id,
    status,
    statusMessage,
}: DbUpdateBotStatusProps): Promise<void> {
    const now = new Date().toISOString()

    await db.prepare(`
        UPDATE bots 
        SET status = ?, status_message = ?, last_check = ?, updated_at = ?
        WHERE id = ?
    `).bind(status, statusMessage || null, now, now, id).run()
}
