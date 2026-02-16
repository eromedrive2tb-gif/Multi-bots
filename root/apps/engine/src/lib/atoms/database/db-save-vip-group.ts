/**
 * ATOM: db-save-vip-group
 * Responsabilidade: Cria ou Atualiza um Grupo VIP
 */

import type { Result, VipGroup } from '../../../core/types'

export interface DbSaveVipGroupProps {
    db: D1Database
    tenantId: string
    group: VipGroup
}

export async function dbSaveVipGroup({
    db,
    tenantId,
    group,
}: DbSaveVipGroupProps): Promise<Result<VipGroup>> {
    try {
        // Verifica se já existe (UPSERT logic via code or standard SQL if supported)
        // D1 supports ON CONFLICT logic

        const now = new Date().toISOString()

        await db
            .prepare(
                `INSERT INTO vip_groups (
                    id, tenant_id, provider, provider_id, name, type, 
                    invite_link, bot_id, metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    provider = excluded.provider,
                    provider_id = excluded.provider_id,
                    name = excluded.name,
                    type = excluded.type,
                    invite_link = excluded.invite_link,
                    bot_id = excluded.bot_id,
                    metadata = excluded.metadata,
                    updated_at = excluded.updated_at`
            )
            .bind(
                group.id,
                tenantId,
                group.provider,
                group.providerId,
                group.name,
                group.type,
                group.inviteLink || null,
                group.botId || null,
                JSON.stringify(group.metadata),
                group.createdAt || now,
                now
            )
            .run()

        return { success: true, data: { ...group, updatedAt: now } }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao salvar grupo VIP',
        }
    }
}
