/**
 * ATOM: db-get-vip-group-by-id
 * Responsabilidade: Busca um Grupo VIP pelo ID
 */

import type { Result, VipGroup } from '../../../core/types'

export interface DbGetVipGroupByIdProps {
    db: D1Database
    tenantId: string
    id: string
}

export async function dbGetVipGroupById({
    db,
    tenantId,
    id,
}: DbGetVipGroupByIdProps): Promise<Result<VipGroup | null>> {
    try {
        const group = await db
            .prepare(
                `SELECT 
                    id, tenant_id as tenantId, provider, provider_id as providerId, 
                    name, type, invite_link as inviteLink, bot_id as botId, 
                    metadata, created_at as createdAt, updated_at as updatedAt
                FROM vip_groups 
                WHERE tenant_id = ? AND id = ?`
            )
            .bind(tenantId, id)
            .first<any>()

        if (!group) {
            return { success: true, data: null }
        }

        return {
            success: true,
            data: {
                ...group,
                metadata: JSON.parse(group.metadata || '{}'),
            } as VipGroup,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao buscar grupo VIP',
        }
    }
}
