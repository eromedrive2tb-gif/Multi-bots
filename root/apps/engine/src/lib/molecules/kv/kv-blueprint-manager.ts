/**
 * MOLECULE: kv-blueprint-manager
 * Responsabilidade: Orquestra operações de blueprint no KV com lógica de fallback
 * Segue o padrão de composição de átomos
 */

import { kvGet, kvPut } from '../../atoms'
import { type Blueprint, blueprintSchema, type Result } from '../../../core/types'

// ============================================
// KEY BUILDERS
// ============================================

const buildBlueprintKey = (tenantId: string, flowId: string) => `tenant:${tenantId}:flow:${flowId}`
const buildTriggerKey = (tenantId: string, trigger: string) => `tenant:${tenantId}:trigger:${trigger}`

// ============================================
// OPERATIONS
// ============================================

/**
 * Busca um blueprint por ID (apenas do tenant específico)
 */
export async function getBlueprintFromKv(
    kv: KVNamespace,
    tenantId: string,
    flowId: string
): Promise<Result<Blueprint | null>> {
    const tenantBp = await kvGet<Blueprint>({ kv, key: buildBlueprintKey(tenantId, flowId) })

    if (!tenantBp.success) return tenantBp
    if (!tenantBp.data) return { success: true, data: null }

    // Validação do blueprint
    const parsed = blueprintSchema.safeParse(tenantBp.data)
    if (!parsed.success) {
        return { success: false, error: `Blueprint inválido: ${parsed.error.message}` }
    }

    return { success: true, data: parsed.data }
}

/**
 * Busca blueprint por trigger (/start, etc) - apenas do tenant específico
 */
export async function getBlueprintByTriggerFromKv(
    kv: KVNamespace,
    tenantId: string,
    trigger: string
): Promise<Result<Blueprint | null>> {
    const tenantTrigger = await kvGet<string>({ kv, key: buildTriggerKey(tenantId, trigger), type: 'text' })

    if (!tenantTrigger.success) return { success: false, error: tenantTrigger.error }
    if (!tenantTrigger.data) return { success: true, data: null }

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
