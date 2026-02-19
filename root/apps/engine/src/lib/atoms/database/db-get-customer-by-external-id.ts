import { Result, Customer } from '../../../core/types'

export interface DbGetCustomerByExternalIdProps {
    db: D1Database
    tenantId: string
    externalId: string
}

export async function dbGetCustomerByExternalId({ db, tenantId, externalId }: DbGetCustomerByExternalIdProps): Promise<Result<Customer | null>> {
    try {
        const row = await db.prepare(
            `SELECT * FROM customers WHERE external_id = ? AND tenant_id = ?`
        ).bind(externalId, tenantId).first<any>()

        if (!row) {
            return { success: true, data: null }
        }

        const customer: Customer = {
            id: row.id,
            tenantId: row.tenant_id,
            externalId: row.external_id,
            provider: row.provider as 'tg' | 'dc',
            name: row.name,
            username: row.username,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            lastInteraction: row.last_interaction,
            createdAt: row.created_at
        }

        return { success: true, data: customer }

    } catch (e) {
        console.error('[dbGetCustomerByExternalId] Error:', e)
        return { success: false, error: 'Erro ao buscar cliente por ID externo' }
    }
}
