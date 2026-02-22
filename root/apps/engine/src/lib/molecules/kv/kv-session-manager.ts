/**
 * MOLECULE: kv-session-manager
 * Responsabilidade: Gerencia sessões de usuário no KV
 * Segue o padrão de composição de átomos
 */

import { kvGet, kvPut } from '../../atoms'
import type { SessionData, Result, ProviderType } from '../../../core/types'

// ============================================
// CONSTANTS
// ============================================

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

// ============================================
// KEY BUILDER
// ============================================

const buildSessionKey = (tenantId: string, provider: ProviderType, userId: string) =>
    `tenant:${tenantId}:user:${provider}:${userId}`

// ============================================
// OPERATIONS
// ============================================

/**
 * Busca ou inicia uma nova sessão
 */
export async function getOrCreateSessionAt(
    kv: KVNamespace,
    tenantId: string,
    provider: ProviderType,
    userId: string
): Promise<Result<SessionData>> {
    const key = buildSessionKey(tenantId, provider, userId)

    const result = await kvGet<SessionData>({ kv, key })

    if (!result.success) return { success: false, error: result.error }
    if (result.data) return { success: true, data: result.data }

    const newSession: SessionData = {
        collectedData: {},
        lastActivity: Date.now()
    }

    const saveResult = await kvPut({
        kv,
        key,
        value: JSON.stringify(newSession),
        expirationTtl: SESSION_TTL_SECONDS
    })

    if (!saveResult.success) return { success: false, error: saveResult.error }

    return { success: true, data: newSession }
}

/**
 * Atualiza dados da sessão
 */
export async function updateSessionAt(
    kv: KVNamespace,
    tenantId: string,
    provider: ProviderType,
    userId: string,
    partialData: Partial<SessionData['collectedData']>,
    flowState?: { flowId?: string; stepId?: string }
): Promise<Result<SessionData>> {
    const key = buildSessionKey(tenantId, provider, userId)

    const current = await kvGet<SessionData>({ kv, key })
    if (!current.success) return { success: false, error: current.error }

    const existing = current.data

    const updated: SessionData = {
        currentFlowId: flowState?.flowId ?? existing?.currentFlowId,
        currentStepId: flowState?.stepId ?? existing?.currentStepId,
        collectedData: {
            ...(existing?.collectedData ?? {}),
            ...partialData,
        },
        lastActivity: Date.now(),
    }

    const save = await kvPut({
        kv,
        key,
        value: JSON.stringify(updated),
        expirationTtl: SESSION_TTL_SECONDS
    })

    if (!save.success) return { success: false, error: save.error }

    return { success: true, data: updated }
}

/**
 * Limpa todas as sessões de um tenant (usado no CLEAR_CUSTOMERS)
 */
export async function kvClearTenantSessions(
    kv: KVNamespace,
    tenantId: string
): Promise<Result<void>> {
    try {
        const prefix = `tenant:${tenantId}:user:`
        let cursor: string | undefined

        // List and delete in loops to handle more than 1000 keys
        do {
            const list: any = await kv.list({ prefix, cursor, limit: 1000 })

            for (const key of list.keys) {
                await kv.delete(key.name)
            }

            cursor = list.cursor
        } while (cursor)

        return { success: true, data: undefined }
    } catch (error) {
        return { success: false, error: `Failed to clear tenant sessions: ${error}` }
    }
}
