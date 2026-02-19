import { Result } from '../../../core/types'

export interface DbSaveVipGroupMemberProps {
    db: D1Database
    id: string
    tenantId: string
    groupId: string
    customerId: string
    status: 'member' | 'administrator' | 'left' | 'kicked'
    joinedAt: string
    updatedAt: string
}

export async function dbSaveVipGroupMember({ db, id, tenantId, groupId, customerId, status, joinedAt, updatedAt }: DbSaveVipGroupMemberProps): Promise<Result<void>> {
    try {
        await db.prepare(`
            INSERT INTO vip_group_members (id, tenant_id, group_id, customer_id, status, joined_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(group_id, customer_id) DO UPDATE SET
            status = excluded.status,
            updated_at = excluded.updated_at,
            left_at = CASE WHEN excluded.status IN ('member', 'administrator') THEN NULL ELSE left_at END
        `).bind(
            id,
            tenantId,
            groupId,
            customerId,
            status,
            joinedAt,
            updatedAt
        ).run()
        return { success: true, data: undefined }
    } catch (e) {
        console.error('[dbSaveVipGroupMember] Error:', e)
        return { success: false, error: 'Falha ao salvar membro do grupo VIP' }
    }
}
