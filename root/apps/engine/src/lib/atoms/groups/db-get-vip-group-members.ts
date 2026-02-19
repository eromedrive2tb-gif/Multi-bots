import { Result } from '../../../core/types'

export interface DbGetVipGroupMembersProps {
    db: D1Database
    groupId: string
}

export async function dbGetVipGroupMembers({ db, groupId }: DbGetVipGroupMembersProps): Promise<Result<any[]>> {
    try {
        const { results } = await db.prepare(`
            SELECT 
                m.*,
                c.name as customer_name,
                c.username as customer_username,
                c.external_id
            FROM vip_group_members m
            JOIN customers c ON m.customer_id = c.id
            WHERE m.group_id = ?
            ORDER BY m.joined_at DESC
        `).bind(groupId).all()

        return { success: true, data: results || [] }
    } catch (e) {
        console.error('[dbGetVipGroupMembers] Error:', e)
        return { success: false, error: 'Falha ao listar membros do grupo VIP' }
    }
}
