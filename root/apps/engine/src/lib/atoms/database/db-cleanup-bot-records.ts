/**
 * ATOM: db-cleanup-bot-records
 * Responsabilidade: Limpa ou desvincula registros dependentes de um bot antes da exclusão
 * SRP: Resolve restrições de chave estrangeira (FK)
 */

export interface DbCleanupBotRecordsProps {
    db: D1Database
    botId: string
    tenantId: string
}

export async function dbCleanupBotRecords({ db, botId, tenantId }: DbCleanupBotRecordsProps): Promise<boolean> {
    try {
        // Usamos batch para performance e atomicidade parcial no D1
        await db.batch([
            // 1. Remove analytics (Pode ser deletado sem dó)
            db.prepare(`
                DELETE FROM analytics_events 
                WHERE bot_id = ? AND tenant_id = ?
            `).bind(botId, tenantId),

            // 2. Remove Broadcasts vinculados (bot_id é NOT NULL)
            db.prepare(`
                DELETE FROM broadcasts 
                WHERE bot_id = ? AND tenant_id = ?
            `).bind(botId, tenantId),

            // 3. Remove Campanhas de Remarketing (bot_id é NOT NULL)
            db.prepare(`
                DELETE FROM remarketing_campaigns 
                WHERE bot_id = ? AND tenant_id = ?
            `).bind(botId, tenantId),

            // 4. Desvincula Transações (bot_id é NULLABLE)
            // Mantemos a transação para histórico financeiro, mas removemos a referência ao bot
            db.prepare(`
                UPDATE transactions 
                SET bot_id = NULL 
                WHERE bot_id = ? AND tenant_id = ?
            `).bind(botId, tenantId),

            // 5. Desvincula Grupos VIP (bot_id é NULLABLE)
            db.prepare(`
                UPDATE vip_groups 
                SET bot_id = NULL 
                WHERE bot_id = ? AND tenant_id = ?
            `).bind(botId, tenantId)
        ])

        return true
    } catch (error) {
        console.error('Error cleaning up bot records:', error)
        // Se falhar a limpeza, o bot não poderá ser deletado
        return false
    }
}
