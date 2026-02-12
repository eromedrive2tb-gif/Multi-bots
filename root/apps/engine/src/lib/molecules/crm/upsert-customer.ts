/**
 * MOLECULE: upsert-customer
 * Responsabilidade: Orquestrar a criação/atualização de cliente com dados da sessão
 */

import { dbUpsertCustomer } from '../../atoms'
import { getOrCreateSessionAt } from '../kv/kv-session-manager'
import type { UniversalContext, Env } from '../../../core/types'

/**
 * Upserts a customer based on the current interaction context
 * Merges session variables (collectedData) into the customer metadata
 */
export async function upsertCustomer(
    ctx: UniversalContext,
    env: Env
): Promise<void> {
    try {
        const { tenantId, userId, provider, metadata } = ctx

        // Validation: Only support tg and dc for now
        if (provider !== 'tg' && provider !== 'dc') {
            return
        }

        // 1. Fetch current session to get collected variables
        const sessionResult = await getOrCreateSessionAt(
            env.SESSIONS_KV,
            tenantId,
            provider,
            String(userId)
        )

        const sessionData = sessionResult.success ? sessionResult.data : null
        const collectedData = sessionData?.collectedData || {}

        // 2. Prepare metadata
        const customerMetadata = {
            ...collectedData,
        }

        // Try to extract username/handle from raw data if available
        let username: string | undefined = undefined
        if (provider === 'tg' && metadata.raw) {
            // Telegram: raw update might have message.from.username
            const raw = metadata.raw as any
            if (raw.message?.from?.username) {
                username = raw.message.from.username
            } else if (raw.callback_query?.from?.username) {
                username = raw.callback_query.from.username
            }
        } else if (provider === 'dc' && metadata.raw) {
            // Discord: raw interaction might have user.username or member.user.username
            const raw = metadata.raw as any
            if (raw.member?.user?.username) {
                username = raw.member.user.username
            } else if (raw.user?.username) {
                username = raw.user.username
            }
        }

        // 3. Upsert in DB
        await dbUpsertCustomer({
            db: ctx.db || env.DB,
            tenantId,
            externalId: String(userId),
            provider, // Typescript knows it's 'tg' | 'dc' due to check above
            name: metadata.userName || 'Unknown',
            username,
            metadata: customerMetadata
        })

    } catch (error) {
        console.error('[Molecule] Error in upsertCustomer:', error)
    }
}
