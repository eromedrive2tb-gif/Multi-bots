/**
 * ATOM: db-get-vip-groups
 * Responsabilidade: Lista Grupos VIP do tenant
 */

import type { Result, VipGroup } from '../../../core/types'

export interface DbGetVipGroupsProps {
    db: D1Database
    tenantId: string
}

export async function dbGetVipGroups({
    db,
    tenantId,
}: DbGetVipGroupsProps): Promise<Result<VipGroup[]>> {
    try {
        const { results } = await db
            .prepare(
                `SELECT 
                    id, tenant_id as tenantId, provider, provider_id as providerId, 
                    name, type, invite_link as inviteLink, bot_id as botId, 
                    metadata, created_at as createdAt, updated_at as updatedAt
                FROM vip_groups 
                WHERE tenant_id = ?
                ORDER BY created_at DESC`
            )
            .bind(tenantId)
            .all<any>()

        const groups = results.map((g) => ({
            ...g,
            metadata: JSON.parse(g.metadata || '{}'),
        })) as VipGroup[]

        return { success: true, data: groups }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao listar grupos VIP',
        }
    }
}
