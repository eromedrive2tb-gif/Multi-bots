/**
 * ATOM: db-get-blueprints
 * Responsabilidade: Busca blueprints do D1
 * SRP: Apenas leitura, não toca KV
 */

import type { Blueprint, Result } from '../../../core/types'

// ============================================
// INTERFACES
// ============================================

export interface BlueprintRow {
    id: string
    tenant_id: string
    name: string
    trigger: string
    json_data: string
    version: string
    is_active: number
    created_at: string
    updated_at: string
}

export interface BlueprintListItem {
    id: string
    name: string
    trigger: string
    version: string
    isActive: boolean
    createdAt: string
    updatedAt: string
}

// ============================================
// LIST BLUEPRINTS
// ============================================

export interface DbGetBlueprintsProps {
    db: D1Database
    tenantId: string
    activeOnly?: boolean
    includeContent?: boolean
}

export async function dbGetBlueprints({
    db,
    tenantId,
    activeOnly = false,
    includeContent = false,
}: DbGetBlueprintsProps): Promise<Result<(BlueprintListItem & Partial<Blueprint>)[]>> {
    try {
        let fields = 'id, name, trigger, version, is_active, created_at, updated_at'
        if (includeContent) {
            fields += ', json_data'
        }

        let query = `
            SELECT ${fields}
            FROM blueprints
            WHERE tenant_id = ?
        `

        if (activeOnly) {
            query += ' AND is_active = 1'
        }

        query += ' ORDER BY updated_at DESC'

        const result = await db.prepare(query).bind(tenantId).all<BlueprintRow>()

        const blueprints = result.results.map(row => {
            const base = {
                id: row.id,
                name: row.name,
                trigger: row.trigger,
                version: row.version,
                isActive: row.is_active === 1,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }

            if (includeContent && row.json_data) {
                try {
                    const parsed = JSON.parse(row.json_data)
                    return { ...base, ...parsed }
                } catch (e) {
                    return base
                }
            }
            return base
        })

        return { success: true, data: blueprints }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao listar blueprints',
        }
    }
}

// ============================================
// GET SINGLE BLUEPRINT
// ============================================

export interface DbGetBlueprintByIdProps {
    db: D1Database
    tenantId: string
    id: string
}

export async function dbGetBlueprintById({
    db,
    tenantId,
    id,
}: DbGetBlueprintByIdProps): Promise<Result<Blueprint | null>> {
    try {
        const row = await db.prepare(`
            SELECT json_data FROM blueprints
            WHERE id = ? AND tenant_id = ?
        `).bind(id, tenantId).first<{ json_data: string }>()

        if (!row) {
            return { success: true, data: null }
        }

        const blueprint = JSON.parse(row.json_data) as Blueprint
        return { success: true, data: blueprint }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao buscar blueprint',
        }
    }
}

// ============================================
// GET BY TRIGGER
// ============================================

export interface DbGetBlueprintByTriggerProps {
    db: D1Database
    tenantId: string
    trigger: string
}

export async function dbGetBlueprintByTrigger({
    db,
    tenantId,
    trigger,
}: DbGetBlueprintByTriggerProps): Promise<Result<Blueprint | null>> {
    try {
        const row = await db.prepare(`
            SELECT json_data FROM blueprints
            WHERE trigger = ? AND tenant_id = ? AND is_active = 1
        `).bind(trigger, tenantId).first<{ json_data: string }>()

        if (!row) {
            return { success: true, data: null }
        }

        const blueprint = JSON.parse(row.json_data) as Blueprint
        return { success: true, data: blueprint }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao buscar blueprint por trigger',
        }
    }
}
