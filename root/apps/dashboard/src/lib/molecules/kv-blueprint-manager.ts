/**
 * MOLECULE: kv-blueprint-manager
 * Responsabilidade: Orquestra operações de blueprint no KV com lógica de fallback
 * Segue o padrão de composição de átomos
 */

import { kvGet, kvPut } from '../atoms/kv'
import { type Blueprint, blueprintSchema, type Result } from '../../core/types'

// ============================================
// KEY BUILDERS
// ============================================

const buildBlueprintKey = (tenantId: string, flowId: string) => `tenant:${tenantId}:flow:${flowId}`
const buildTriggerKey = (tenantId: string, trigger: string) => `tenant:${tenantId}:trigger:${trigger}`

// ============================================
// OPERATIONS
// ============================================

/**
 * Busca um blueprint por ID com fallback para o global
 */
export async function getBlueprintFromKv(
    kv: KVNamespace,
    tenantId: string,
    flowId: string
): Promise<Result<Blueprint | null>> {
    // 1. Tenta buscar específico do tenant
    const tenantBp = await kvGet<Blueprint>({ kv, key: buildBlueprintKey(tenantId, flowId) })

    if (!tenantBp.success) return tenantBp

    // 2. Se não achou e não é global, tenta o global
    if (!tenantBp.data && tenantId !== 'global') {
        const globalBp = await kvGet<Blueprint>({ kv, key: buildBlueprintKey('global', flowId) })
        if (!globalBp.success) return globalBp
        if (!globalBp.data) return { success: true, data: null }

        // Validação do global
        const parsed = blueprintSchema.safeParse(globalBp.data)
        if (!parsed.success) return { success: false, error: `Blueprint global inválido: ${parsed.error.message}` }
        return { success: true, data: parsed.data }
    }

    if (!tenantBp.data) return { success: true, data: null }

    // 3. Validação do tenant-specific
    const parsed = blueprintSchema.safeParse(tenantBp.data)
    if (!parsed.success) {
        return { success: false, error: `Blueprint inválido: ${parsed.error.message}` }
    }

    return { success: true, data: parsed.data }
}

/**
 * Busca blueprint por trigger (/start, etc)
 */
export async function getBlueprintByTriggerFromKv(
    kv: KVNamespace,
    tenantId: string,
    trigger: string
): Promise<Result<Blueprint | null>> {
    // 1. Busca flowId associado ao trigger (tenant)
    const tenantTrigger = await kvGet<string>({ kv, key: buildTriggerKey(tenantId, trigger), type: 'text' })

    if (!tenantTrigger.success) return { success: false, error: tenantTrigger.error }

    // 2. Fallback para trigger global
    if (!tenantTrigger.data && tenantId !== 'global') {
        const globalTrigger = await kvGet<string>({ kv, key: buildTriggerKey('global', trigger), type: 'text' })
        if (!globalTrigger.success) return { success: false, error: globalTrigger.error }
        if (!globalTrigger.data) return { success: true, data: null }
        return getBlueprintFromKv(kv, tenantId, globalTrigger.data)
    }

    if (!tenantTrigger.data) return { success: true, data: null }

    // 3. Busca o blueprint real
    return getBlueprintFromKv(kv, tenantId, tenantTrigger.data)
}

/**
 * Salva blueprint e atualiza índice de trigger
 */
export async function saveBlueprintToKv(
    kv: KVNamespace,
    tenantId: string,
    blueprint: Blueprint
): Promise<Result<void>> {
    const valid = blueprintSchema.safeParse(blueprint)
    if (!valid.success) return { success: false, error: valid.error.message }

    // 1. Salva o blueprint
    const saveBp = await kvPut({
        kv,
        key: buildBlueprintKey(tenantId, valid.data.id),
        value: JSON.stringify(valid.data)
    })

    if (!saveBp.success) return saveBp

    // 2. Atualiza o índice do trigger
    const saveTrigger = await kvPut({
        kv,
        key: buildTriggerKey(tenantId, valid.data.trigger),
        value: valid.data.id
    })

    return saveTrigger
}
