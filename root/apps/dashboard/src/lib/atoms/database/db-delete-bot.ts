/**
 * ATOM: db-delete-bot
 * Responsabilidade: Remove um bot do banco
 * SRP: Apenas deleta, não limpa webhook, não notifica
 */

export interface DbDeleteBotProps {
    db: D1Database
    id: string
    tenantId: string  // Para garantir isolamento multi-tenant
}

export async function dbDeleteBot({ db, id, tenantId }: DbDeleteBotProps): Promise<boolean> {
    const result = await db.prepare(`
        DELETE FROM bots 
        WHERE id = ? AND tenant_id = ?
    `).bind(id, tenantId).run()

    return result.meta.changes > 0
}
