/**
 * ATOM: db-delete-vip-group
 * Responsabilidade: Remove um Grupo VIP
 */

import type { Result } from '../../../core/types'

export interface DbDeleteVipGroupProps {
    db: D1Database
    tenantId: string
    id: string
}

export async function dbDeleteVipGroup({
    db,
    tenantId,
    id,
}: DbDeleteVipGroupProps): Promise<Result<void>> {
    try {
        await db
            .prepare('DELETE FROM vip_groups WHERE tenant_id = ? AND id = ?')
            .bind(tenantId, id)
            .run()

        return { success: true, data: undefined }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao deletar grupo VIP',
        }
    }
}
