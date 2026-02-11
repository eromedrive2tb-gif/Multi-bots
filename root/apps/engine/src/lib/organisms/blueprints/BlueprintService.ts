/**
 * ORGANISM: BlueprintService
 * Responsabilidade: Gerenciamento de Blueprints (CRUD + Sync)
 * Orquestra: Database Atoms, KV Atoms e Molecules
 */

import type { Blueprint, BlueprintListItem, Result } from '../../../core/types'
import { dbSaveBlueprint } from '../../atoms'
import { dbDeleteBlueprint } from '../../atoms'
import { dbGetBlueprints, dbGetBlueprintById } from '../../atoms'
import { saveBlueprintToKv } from '../../molecules'
import { kvDelete } from '../../atoms'

export class BlueprintService {
    constructor(
        private db: D1Database,
        private kv: KVNamespace,
        private tenantId: string
    ) { }

    /**
     * Lista todos os blueprints
     */
    async listBlueprints(): Promise<Result<BlueprintListItem[]>> {
        return dbGetBlueprints({ db: this.db, tenantId: this.tenantId })
    }

    /**
     * Obtém um blueprint por ID
     */
    async getBlueprint(id: string): Promise<Result<Blueprint>> {
        const result = await dbGetBlueprintById({ db: this.db, tenantId: this.tenantId, id })

        if (result.success && !result.data) {
            return { success: false, error: 'Blueprint não encontrado' }
        }

        if (!result.success) {
            return { success: false, error: result.error }
        }

        return { success: true, data: result.data! }
    }

    /**
     * Salva blueprint no D1 e sincroniza com KV
     */
    async saveBlueprint(blueprint: Blueprint): Promise<Result<{ id: string; syncedToKv: boolean }>> {
        // 1. Salva no D1 (source of truth)
        const d1Result = await dbSaveBlueprint({ db: this.db, tenantId: this.tenantId, blueprint })

        if (!d1Result.success) {
            return d1Result
        }

        // 2. Sincroniza com KV (cache)
        const kvResult = await saveBlueprintToKv(this.kv, this.tenantId, blueprint)

        return {
            success: true,
            data: {
                id: d1Result.data.id,
                syncedToKv: kvResult.success,
            },
        }
    }

    /**
     * Remove blueprint do D1 e KV
     */
    async deleteBlueprint(blueprintId: string): Promise<Result<void>> {
        // 1. Deleta do D1 (retorna trigger para cleanup KV)
        const d1Result = await dbDeleteBlueprint({ db: this.db, tenantId: this.tenantId, id: blueprintId })

        if (!d1Result.success) {
            return { success: false, error: d1Result.error }
        }

        // 2. Limpa KV
        if (d1Result.data.trigger) {
            // Remove blueprint
            await kvDelete({ kv: this.kv, key: `tenant:${this.tenantId}:flow:${blueprintId}` })
            // Remove trigger index
            await kvDelete({ kv: this.kv, key: `tenant:${this.tenantId}:trigger:${d1Result.data.trigger}` })
        }

        return { success: true, data: undefined }
    }

    /**
     * Sincroniza todos os blueprints do D1 para o KV
     */
    async fullSyncToKv(): Promise<Result<{ synced: number; failed: number }>> {
        // 1. Lista todos os blueprints ativos do D1
        const listResult = await dbGetBlueprints({ db: this.db, tenantId: this.tenantId, activeOnly: true })

        if (!listResult.success) {
            return { success: false, error: listResult.error }
        }

        let synced = 0
        let failed = 0

        // 2. Sincroniza cada um para o KV
        for (const item of listResult.data) {
            const bpResult = await dbGetBlueprintById({ db: this.db, tenantId: this.tenantId, id: item.id })

            if (!bpResult.success || !bpResult.data) {
                failed++
                continue
            }

            const kvResult = await saveBlueprintToKv(this.kv, this.tenantId, bpResult.data)

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
}
