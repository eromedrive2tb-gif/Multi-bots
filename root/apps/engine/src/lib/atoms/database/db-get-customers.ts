/**
 * ATOM: db-get-customers
 * Responsabilidade: Buscar lista de clientes com filtro e paginação
 */

import type { Customer } from '../../../core/types'
import type { Result } from '../../../core/types'

export interface DbGetCustomersProps {
    db: D1Database
    tenantId: string
    limit?: number
    offset?: number
    search?: string
    provider?: 'tg' | 'dc'
}

export interface DbGetCustomersResult {
    data: Customer[]
    total: number
}

export async function dbGetCustomers({
    db,
    tenantId,
    limit = 20,
    offset = 0,
    search,
    provider
}: DbGetCustomersProps): Promise<Result<DbGetCustomersResult>> {
    try {
        let query = `
            SELECT * FROM customers 
            WHERE tenant_id = ?
        `
        const params: any[] = [tenantId]

        if (provider) {
            query += ` AND provider = ?`
            params.push(provider)
        }

        if (search) {
            query += ` AND (name LIKE ? OR username LIKE ? OR external_id LIKE ?)`
            const like = `%${search}%`
            params.push(like, like, like)
        }

        // Count total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total')
        const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>()
        const total = countResult?.total || 0

        // Fetch data
        query += ` ORDER BY last_interaction DESC LIMIT ? OFFSET ?`
        params.push(limit, offset)

        const results = await db.prepare(query).bind(...params).all<any>()

        if (!results.success) {
            return { success: false, error: results.error || 'Failed to fetch customers' }
        }

        const customers: Customer[] = results.results.map(row => ({
            id: row.id,
            tenantId: row.tenant_id,
            externalId: row.external_id,
            provider: row.provider as 'tg' | 'dc',
            name: row.name,
            username: row.username,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            lastInteraction: row.last_interaction,
            createdAt: row.created_at
        }))

        return {
            success: true,
            data: {
                data: customers,
                total
            }
        }
    } catch (error) {
        return { success: false, error: `Failed to get customers: ${error}` }
    }
}
