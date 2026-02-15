/**
 * ATOM: db-save-bot
 * Responsabilidade: Salva um novo bot no banco D1
 * SRP: Apenas insere no banco, não valida, não notifica
 */

import type { Bot, BotCredentials, BotProvider } from '../../../core/types'

export interface DbSaveBotProps {
    db: D1Database
    id: string
    tenantId: string
    name: string
    username?: string
    provider: BotProvider
    credentials: BotCredentials
    webhookSecret?: string
}

export async function dbSaveBot({
    db,
    id,
    tenantId,
    name,
    username,
    provider,
    credentials,
    webhookSecret,
}: DbSaveBotProps): Promise<Bot> {
    const now = new Date().toISOString()

    await db.prepare(`
        INSERT INTO bots (id, tenant_id, name, username, provider, credentials, webhook_secret, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?)
    `).bind(
        id,
        tenantId,
        name,
        username || null,
        provider,
        JSON.stringify(credentials),
        webhookSecret || null,
        now,
        now
    ).run()

    return {
        id,
        tenantId,
        name,
        username,
        provider,
        credentials,
        webhookSecret,
        status: 'offline',
        createdAt: new Date(now),
        updatedAt: new Date(now),
    }
}
