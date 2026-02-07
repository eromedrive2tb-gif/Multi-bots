/**
 * ATOM: db-delete-blueprint
 * Responsabilidade: Remove um blueprint do D1
 * SRP: Apenas deleção em D1, não sincroniza KV
 */

import type { Result } from '../../../core/types'

export interface DbDeleteBlueprintProps {
    db: D1Database
    tenantId: string
    id: string
}

export async function dbDeleteBlueprint({
    db,
    tenantId,
    id,
}: DbDeleteBlueprintProps): Promise<Result<{ trigger: string | null }>> {
    try {
        // Get trigger before delete for KV cleanup
        const existing = await db.prepare(`
            SELECT trigger FROM blueprints WHERE id = ? AND tenant_id = ?
        `).bind(id, tenantId).first<{ trigger: string }>()

        if (!existing) {
            return { success: true, data: { trigger: null } }
        }

        await db.prepare(`
            DELETE FROM blueprints WHERE id = ? AND tenant_id = ?
        `).bind(id, tenantId).run()

        return {
            success: true,
            data: { trigger: existing.trigger },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao deletar blueprint',
        }
    }
}

/**
 * Soft delete - desativa o blueprint em vez de remover
 */
export async function dbDeactivateBlueprint({
    db,
    tenantId,
    id,
}: DbDeleteBlueprintProps): Promise<Result<void>> {
    try {
        await db.prepare(`
            UPDATE blueprints SET is_active = 0, updated_at = ? WHERE id = ? AND tenant_id = ?
        `).bind(new Date().toISOString(), id, tenantId).run()

        return { success: true, data: undefined }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao desativar blueprint',
        }
    }
}
