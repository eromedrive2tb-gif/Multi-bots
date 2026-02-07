/**
 * ATOM: db-save-blueprint
 * Responsabilidade: Salva um blueprint no D1
 * SRP: Apenas operação de escrita, não sincroniza com KV
 */

import type { Blueprint, Result } from '../../../core/types'

export interface DbSaveBlueprintProps {
    db: D1Database
    tenantId: string
    blueprint: Blueprint
}

export interface DbSaveBlueprintResult {
    id: string
    isNew: boolean
}

export async function dbSaveBlueprint({
    db,
    tenantId,
    blueprint,
}: DbSaveBlueprintProps): Promise<Result<DbSaveBlueprintResult>> {
    try {
        const now = new Date().toISOString()

        // Check if exists
        const existing = await db.prepare(`
            SELECT id FROM blueprints WHERE id = ? AND tenant_id = ?
        `).bind(blueprint.id, tenantId).first<{ id: string }>()

        if (existing) {
            // Update
            await db.prepare(`
                UPDATE blueprints 
                SET name = ?, trigger = ?, json_data = ?, version = ?, updated_at = ?
                WHERE id = ? AND tenant_id = ?
            `).bind(
                blueprint.name ?? blueprint.id,
                blueprint.trigger,
                JSON.stringify(blueprint),
                blueprint.version ?? '1.0',
                now,
                blueprint.id,
                tenantId
            ).run()

            return {
                success: true,
                data: { id: blueprint.id, isNew: false },
            }
        }

        // Insert new
        await db.prepare(`
            INSERT INTO blueprints (id, tenant_id, name, trigger, json_data, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            blueprint.id,
            tenantId,
            blueprint.name ?? blueprint.id,
            blueprint.trigger,
            JSON.stringify(blueprint),
            blueprint.version ?? '1.0',
            now,
            now
        ).run()

        return {
            success: true,
            data: { id: blueprint.id, isNew: true },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao salvar blueprint',
        }
    }
}
