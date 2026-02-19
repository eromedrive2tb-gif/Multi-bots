import { Result } from '../../../core/types'

export interface DbUpdateVipGroupMemberStatusProps {
    db: D1Database
    tenantId: string
    groupId: string
    customerId: string
    status: 'member' | 'administrator' | 'left' | 'kicked'
    leftAt: string | null
    updatedAt: string
}

export async function dbUpdateVipGroupMemberStatus({ db, tenantId, groupId, customerId, status, leftAt, updatedAt }: DbUpdateVipGroupMemberStatusProps): Promise<Result<void>> {
    try {
        const result = await db.prepare(`
            UPDATE vip_group_members 
            SET status = ?, left_at = ?, updated_at = ?
            WHERE group_id = ? AND customer_id = ? AND tenant_id = ?
        `).bind(
            status,
            leftAt,
            updatedAt,
            groupId,
            customerId,
            tenantId
        ).run()

        if ((result.meta?.changes ?? 0) === 0) {
            return { success: false, error: 'Membro não encontrado para atualização' }
        }

        return { success: true, data: undefined }
    } catch (e) {
        console.error('[dbUpdateVipGroupMemberStatus] Error:', e)
        return { success: false, error: 'Falha ao atualizar status do membro VIP' }
    }
}
