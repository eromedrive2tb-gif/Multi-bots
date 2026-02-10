/**
 * ATOM: db-delete-bot-events
 * Responsabilidade: Remove todos os eventos de analytics de um bot específico
 * SRP: Apenas deleta eventos do bot
 */

export interface DbDeleteBotEventsProps {
    db: D1Database
    botId: string
    tenantId: string
}

export async function dbDeleteBotEvents({ db, botId, tenantId }: DbDeleteBotEventsProps): Promise<boolean> {
    try {
        const result = await db.prepare(`
            DELETE FROM analytics_events 
            WHERE bot_id = ? AND tenant_id = ?
        `).bind(botId, tenantId).run()

        return result.success
    } catch (error) {
        console.error('Error deleting bot analytics events:', error)
        // We still return true or false but we don't throw to avoid crashing the whole bot deletion
        // Actually, if this fails, the bot deletion will fail anyway due to FK.
        // So maybe it's better to let it throw or handle it in the organism.
        return false
    }
}
