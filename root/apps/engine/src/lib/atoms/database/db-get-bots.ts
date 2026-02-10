/**
 * ATOM: db-get-bots
 * Responsabilidade: Lista todos os bots de um tenant
 * SRP: Apenas consulta o banco, não filtra, não transforma
 */

import type { Bot, BotCredentials, BotProvider, BotStatus } from '../../../core/types'

export interface DbGetBotsProps {
    db: D1Database
    tenantId: string
}

interface BotRow {
    id: string
    tenant_id: string
    name: string
    provider: string
    credentials: string
    status: string
    status_message: string | null
    last_check: string | null
    webhook_secret: string | null
    created_at: string
    updated_at: string
}

export async function dbGetBots({ db, tenantId }: DbGetBotsProps): Promise<Bot[]> {
    const result = await db.prepare(`
        SELECT id, tenant_id, name, provider, credentials, status, status_message, 
               last_check, webhook_secret, created_at, updated_at
        FROM bots 
        WHERE tenant_id = ?
        ORDER BY created_at DESC
    `).bind(tenantId).all<BotRow>()

    return result.results.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        provider: row.provider as BotProvider,
        credentials: JSON.parse(row.credentials) as BotCredentials,
        status: row.status as BotStatus,
        statusMessage: row.status_message || undefined,
        lastCheck: row.last_check ? new Date(row.last_check) : undefined,
        webhookSecret: row.webhook_secret || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }))
}

export async function dbGetBotById({ db, id }: { db: D1Database; id: string }): Promise<Bot | null> {
    const row = await db.prepare(`
        SELECT id, tenant_id, name, provider, credentials, status, status_message, 
               last_check, webhook_secret, created_at, updated_at
        FROM bots 
        WHERE id = ?
    `).bind(id).first<BotRow>()

    if (!row) return null

    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        provider: row.provider as BotProvider,
        credentials: JSON.parse(row.credentials) as BotCredentials,
        status: row.status as BotStatus,
        statusMessage: row.status_message || undefined,
        lastCheck: row.last_check ? new Date(row.last_check) : undefined,
        webhookSecret: row.webhook_secret || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }
}
