/**
 * ATOM: db-save-plan
 * Responsabilidade: Salva um plano de venda no banco D1
 * SRP: Apenas insere no banco
 */

import type { Plan } from '../../../core/payment-types'

export interface DbSavePlanProps {
    db: D1Database
    id: string
    tenantId: string
    name: string
    description?: string
    price: number // centavos
    currency?: string
    type: 'one_time' | 'subscription'
    intervalDays?: number
    metadata?: Record<string, unknown>
}

export async function dbSavePlan({
    db,
    id,
    tenantId,
    name,
    description,
    price,
    currency = 'BRL',
    type,
    intervalDays,
    metadata = {},
}: DbSavePlanProps): Promise<Plan> {
    const now = new Date().toISOString()

    await db.prepare(`
        INSERT INTO plans (id, tenant_id, name, description, price, currency, type, interval_days, is_active, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).bind(
        id, tenantId, name, description || null, price, currency,
        type, intervalDays || null, JSON.stringify(metadata), now, now
    ).run()

    return {
        id,
        tenantId,
        name,
        description: description || null,
        price,
        currency,
        type,
        intervalDays: intervalDays || null,
        isActive: true,
        metadata,
        createdAt: now,
        updatedAt: now,
    }
}
