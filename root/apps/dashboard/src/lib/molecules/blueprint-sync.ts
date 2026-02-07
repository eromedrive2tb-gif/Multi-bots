/**
 * MOLECULE: blueprint-sync
 * Responsabilidade: Sincroniza blueprints entre D1 (source of truth) e KV (Edge cache)
 * Orquestra: db-save-blueprint, db-delete-blueprint, kv-blueprint-manager
 */

import type { Blueprint, Result } from '../../core/types'
import { dbSaveBlueprint } from '../atoms/database/db-save-blueprint'
import { dbDeleteBlueprint } from '../atoms/database/db-delete-blueprint'
import { dbGetBlueprints, dbGetBlueprintById } from '../atoms/database/db-get-blueprints'
import { saveBlueprintToKv } from './kv-blueprint-manager'
import { kvDelete } from '../atoms/kv'

// ============================================
// SYNC: D1 → KV
// ============================================

export interface SyncBlueprintProps {
    db: D1Database
    kv: KVNamespace
    tenantId: string
    blueprint: Blueprint
}

/**
 * Salva blueprint no D1 e sincroniza com KV
 */
export async function syncSaveBlueprint({
    db,
    kv,
    tenantId,
    blueprint,
}: SyncBlueprintProps): Promise<Result<{ id: string; syncedToKv: boolean }>> {
    // 1. Salva no D1 (source of truth)
    const d1Result = await dbSaveBlueprint({ db, tenantId, blueprint })

    if (!d1Result.success) {
        return d1Result
    }

    // 2. Sincroniza com KV (cache)
    const kvResult = await saveBlueprintToKv(kv, tenantId, blueprint)

    return {
        success: true,
        data: {
            id: d1Result.data.id,
            syncedToKv: kvResult.success,
        },
    }
}

// ============================================
// DELETE: D1 + KV
// ============================================

export interface SyncDeleteBlueprintProps {
    db: D1Database
    kv: KVNamespace
    tenantId: string
    blueprintId: string
}

/**
 * Remove blueprint do D1 e KV
 */
export async function syncDeleteBlueprint({
    db,
    kv,
    tenantId,
    blueprintId,
}: SyncDeleteBlueprintProps): Promise<Result<void>> {
    // 1. Deleta do D1 (retorna trigger para cleanup KV)
    const d1Result = await dbDeleteBlueprint({ db, tenantId, id: blueprintId })

    if (!d1Result.success) {
        return { success: false, error: d1Result.error }
    }

    // 2. Limpa KV
    if (d1Result.data.trigger) {
        // Remove blueprint
        await kvDelete({ kv, key: `tenant:${tenantId}:flow:${blueprintId}` })
        // Remove trigger index
        await kvDelete({ kv, key: `tenant:${tenantId}:trigger:${d1Result.data.trigger}` })
    }

    return { success: true, data: undefined }
}

// ============================================
// FULL SYNC: D1 → KV (bulk)
// ============================================

export interface FullSyncBlueprintsProps {
    db: D1Database
    kv: KVNamespace
    tenantId: string
}

/**
 * Sincroniza todos os blueprints do D1 para o KV
 * Útil para recuperação ou inicialização
 */
export async function fullSyncBlueprintsToKv({
    db,
    kv,
    tenantId,
}: FullSyncBlueprintsProps): Promise<Result<{ synced: number; failed: number }>> {
    // 1. Lista todos os blueprints ativos do D1
    const listResult = await dbGetBlueprints({ db, tenantId, activeOnly: true })

    if (!listResult.success) {
        return { success: false, error: listResult.error }
    }

    let synced = 0
    let failed = 0

    // 2. Sincroniza cada um para o KV
    for (const item of listResult.data) {
        const bpResult = await dbGetBlueprintById({ db, tenantId, id: item.id })

        if (!bpResult.success || !bpResult.data) {
            failed++
            continue
        }

        const kvResult = await saveBlueprintToKv(kv, tenantId, bpResult.data)

        if (kvResult.success) {
            synced++
        } else {
            failed++
        }
    }

    return {
        success: true,
        data: { synced, failed },
    }
}
