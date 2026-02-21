/**
 * QUEUE CONSUMER
 * Processes webhook events from Cloudflare Queues.
 * 
 * Flow: Queue → Idempotency Check (D1) → Route → Engine + Event Dispatch → Mark Completed
 * 
 * Hardening (Phase 5):
 * - Atomic Idempotency: Uses 'processing' status to avoid the "Retry Paradox".
 * - Parallel Processing: Promises.allSettled for high throughput within CPU limits.
 * - Resilience: individual msg.ack()/retry() based on per-message result.
 */

import type { Env } from '../../core/types'
import type { DomainEvent } from '../../core/domain-events'
import { DomainEventType, createDomainEvent } from '../../core/domain-events'
import type {
    UserInteractedPayload,
    FlowCompletedPayload,
    FlowErrorPayload,
} from '../../core/domain-events'
import { tgHandleUpdate, type TelegramUpdate } from '../../lib/atoms'
import { dbGetBotById } from '../../lib/atoms'
import { executeFromTrigger } from '../../lib/organisms'
import { getBlueprintByTriggerFromKv } from '../../lib/molecules'
import { dispatcher } from '../events/EventDispatcher'
import { setupEventSubscribers } from '../events/subscriber-setup'
import { setupRegistry } from '../../lib/molecules'
import type { TelegramCredentials, UniversalContext } from '../../core/types'

// ============================================
// TYPES
// ============================================

export interface WebhookQueueMessage {
    provider: 'telegram' | 'discord'
    botId: string
    tenantId: string
    idempotencyKey: string
    payload: unknown
    enqueuedAt: number
}

type IdempotencyStatus = 'NEW' | 'DUPLICATE' | 'RETRY'

// ============================================
// IDEMPOTENCY (Hardened)
// ============================================

/**
 * Check and mark a webhook as processing.
 * Returns 'NEW' if first time, 'DUPLICATE' if already completed, 'RETRY' if failed/interrupted before.
 */
async function getIdempotencyStatus(
    db: D1Database,
    key: string,
    provider: string,
    tenantId: string,
    botId: string
): Promise<IdempotencyStatus> {
    try {
        // 1. Try to insert with 'processing' status
        const insert = await db.prepare(
            `INSERT OR IGNORE INTO processed_webhooks 
             (idempotency_key, provider, tenant_id, bot_id, processed_at, status) 
             VALUES (?, ?, ?, ?, ?, 'processing')`
        ).bind(key, provider, tenantId, botId, Date.now()).run()

        if ((insert.meta?.changes ?? 0) > 0) {
            return 'NEW'
        }

        // 2. Already exists, check if it was completed
        const existing = await db.prepare(
            'SELECT status FROM processed_webhooks WHERE idempotency_key = ?'
        ).bind(key).first<{ status: string }>()

        if (existing?.status === 'completed') {
            return 'DUPLICATE'
        }

        // 3. Status is 'processing' or 'failed' (from previous crash/timeout)
        // Allow retry. Update timestamp to current attempt.
        await db.prepare(
            'UPDATE processed_webhooks SET processed_at = ?, status = "processing" WHERE idempotency_key = ?'
        ).bind(Date.now(), key).run()

        return 'RETRY'
    } catch (err) {
        console.error('[Idempotency] Failed to determine status:', err)
        // Fallback to NEW to avoid losing messages, but risk duplication
        return 'NEW'
    }
}

/**
 * Mark a webhook as successfully processed.
 */
async function markAsCompleted(db: D1Database, key: string): Promise<void> {
    try {
        await db.prepare(
            'UPDATE processed_webhooks SET status = "completed" WHERE idempotency_key = ?'
        ).bind(key).run()
    } catch (err) {
        console.error('[Idempotency] Failed to mark as completed:', err)
    }
}

async function markAsFailed(db: D1Database, key: string, error: string): Promise<void> {
    try {
        await db.prepare(
            'UPDATE processed_webhooks SET status = "failed" WHERE idempotency_key = ?'
        ).bind(key).run()
    } catch (err) {
        console.error('[Idempotency] Failed to mark as failed:', err)
    }
}

// ============================================
// TELEGRAM PROCESSOR
// ============================================

async function processTelegramUpdate(
    msg: WebhookQueueMessage,
    env: Env,
    waitUntil: (p: Promise<any>) => void
): Promise<void> {
    const update = msg.payload as TelegramUpdate

    // 1. Get bot credentials
    const bot = await dbGetBotById({ db: env.DB, id: msg.botId })
    if (!bot) {
        throw new Error(`Bot not found: ${msg.botId}`)
    }

    const credentials = bot.credentials as TelegramCredentials
    const token = credentials.token

    // 2. Handle group events via Event Bus
    if (update.my_chat_member) {
        const m = update.my_chat_member
        const newStatus = m.new_chat_member.status
        const eventType = ['member', 'administrator', 'creator'].includes(newStatus)
            ? DomainEventType.BOT_ADDED_TO_GROUP
            : DomainEventType.BOT_REMOVED_FROM_GROUP

        dispatcher.emit(
            createDomainEvent(eventType, msg.tenantId, msg.botId, 'tg', {
                chatId: String(m.chat.id),
                chatTitle: m.chat.title || `Group ${m.chat.id}`,
                chatType: m.chat.type,
                botId: msg.botId,
                fromUserId: String(m.from.id),
                fromUsername: m.from.username,
                fromFirstName: m.from.first_name,
                date: m.date,
                raw: update,
            }),
            env,
            waitUntil
        )
        return
    }

    if (update.chat_member) {
        const m = update.chat_member
        const newStatus = m.new_chat_member.status
        const eventType = ['member', 'administrator', 'creator'].includes(newStatus)
            ? DomainEventType.USER_JOINED_GROUP
            : DomainEventType.USER_LEFT_GROUP

        dispatcher.emit(
            createDomainEvent(eventType, msg.tenantId, msg.botId, 'tg', {
                chatId: String(m.chat.id),
                userId: String(m.new_chat_member.user.id),
                status: newStatus,
                username: m.new_chat_member.user.username,
                firstName: m.new_chat_member.user.first_name,
                botId: msg.botId,
            }),
            env,
            waitUntil
        )
        return
    }

    // 3. Passive member upsert for group messages
    if (update.message && ['group', 'supergroup'].includes(update.message.chat.type)) {
        dispatcher.emit(
            createDomainEvent(DomainEventType.USER_MESSAGE_IN_GROUP, msg.tenantId, msg.botId, 'tg', {
                chatId: String(update.message.chat.id),
                userId: String(update.message.from.id),
                username: update.message.from.username,
                fullName: [update.message.from.first_name, (update.message.from as any).last_name].filter(Boolean).join(' ') || 'Unknown',
                botId: msg.botId,
            }),
            env,
            waitUntil
        )
    }

    // 4. Build context for engine
    const parsed = tgHandleUpdate(update)
    if (!parsed.message) return

    const ctx: UniversalContext = {
        provider: 'tg',
        tenantId: msg.tenantId,
        userId: parsed.message.from.id,
        chatId: parsed.message.chatId,
        botToken: token,
        botId: msg.botId,
        db: env.DB,
        waitUntil,
        metadata: {
            userName: parsed.message.from.name,
            lastInput: parsed.message.text,
            command: parsed.isCommand ? parsed.command : undefined,
            raw: update,
        },
    }

    // 5. Emit USER_INTERACTED (CRM)
    dispatcher.emit(
        createDomainEvent<UserInteractedPayload>(
            DomainEventType.USER_INTERACTED, msg.tenantId, msg.botId, 'tg',
            { ctx }
        ),
        env,
        waitUntil
    )

    // 6. Deep linking support
    if (ctx.metadata.command) {
        if (ctx.metadata.command === 'start' && ctx.metadata.lastInput) {
            const parts = ctx.metadata.lastInput.trim().split(/\s+/)
            if (parts.length >= 2) {
                const payload = parts[1]
                const potentialTrigger = payload.startsWith('/') ? payload : `/${payload}`
                const bpResult = await getBlueprintByTriggerFromKv(env.BLUEPRINTS_KV, msg.tenantId, potentialTrigger)
                if (bpResult.success && bpResult.data) {
                    ctx.metadata.command = potentialTrigger.replace('/', '')
                    ctx.metadata.lastInput = potentialTrigger
                }
            }
        }
    }

    // 7. Run Engine
    const result = await executeFromTrigger(
        { blueprints: env.BLUEPRINTS_KV, sessions: env.SESSIONS_KV },
        ctx
    )

    if (!result.success && result.error) {
        throw new Error(`Engine execution failed: ${result.error}`)
    }

    const blueprintId = result.blueprintId || 'unknown'

    // 8. Emit post-execution events
    if (blueprintId !== 'unknown') {
        if (result.success && !result.lastStepId) {
            dispatcher.emit(
                createDomainEvent<FlowCompletedPayload>(
                    DomainEventType.FLOW_COMPLETED, msg.tenantId, msg.botId, 'tg',
                    { ctx, blueprintId, stepsExecuted: result.stepsExecuted }
                ),
                env,
                waitUntil
            )
        } else if (result.error) {
            dispatcher.emit(
                createDomainEvent<FlowErrorPayload>(
                    DomainEventType.FLOW_ERROR, msg.tenantId, msg.botId, 'tg',
                    {
                        ctx,
                        blueprintId,
                        error: result.error,
                        stepsExecuted: result.stepsExecuted,
                        lastStepId: result.lastStepId,
                    }
                ),
                env,
                waitUntil
            )
        }
    }
}

// ============================================
// QUEUE HANDLER (exported for Worker)
// ============================================

async function processSingleMessage(
    message: Message<WebhookQueueMessage>,
    env: Env,
    ctx: ExecutionContext
): Promise<void> {
    const msg = message.body

    try {
        // 1. Idempotency check 
        const status = await getIdempotencyStatus(
            env.DB,
            msg.idempotencyKey,
            msg.provider,
            msg.tenantId,
            msg.botId
        )

        if (status === 'DUPLICATE') {
            console.log(`[QueueConsumer] Duplicate skipped: ${msg.idempotencyKey}`)
            message.ack()
            return
        }

        // 2. Route by provider
        switch (msg.provider) {
            case 'telegram':
                await processTelegramUpdate(msg, env, ctx.waitUntil.bind(ctx))
                break
            case 'discord':
                console.warn('[QueueConsumer] Discord events should not be queued')
                break
            default:
                console.error(`[QueueConsumer] Unknown provider: ${msg.provider}`)
        }

        // 3. Success -> Mark as completed
        await markAsCompleted(env.DB, msg.idempotencyKey)
        message.ack()
        console.log(`[QueueConsumer] Success: ${msg.idempotencyKey}`)

    } catch (err) {
        console.error(`[QueueConsumer] Failed to process ${msg.idempotencyKey}:`, err)
        await markAsFailed(env.DB, msg.idempotencyKey, String(err))
        message.retry()
    }
}

/**
 * Cloudflare Queue consumer handler (Hardened).
 */
export async function handleQueue(
    batch: MessageBatch<WebhookQueueMessage>,
    env: Env,
    ctx: ExecutionContext
): Promise<void> {
    // Ensure registries are initialized
    setupRegistry()
    setupEventSubscribers()

    console.log(`[QueueConsumer] Received batch of ${batch.messages.length} messages`)

    // Hardening V2: User-Level Sequencing
    // We group messages by User ID to ensure that multiples events from the same user
    // are processed sequentially, preventing race conditions on KV session updates.
    // However, events from DIFFERENT users are processed in parallel.

    const messagesByUser: Record<string, Message<WebhookQueueMessage>[]> = {}

    for (const message of batch.messages) {
        // Build a unique key for the sequence: provider + tenant + user
        // We use the payload's userId if available (built-in during handleTelegramWebhook)
        // or a fallback from payload parsing.

        const msg = message.body
        const userId = (msg.payload as any)?.message?.from?.id ||
            (msg.payload as any)?.callback_query?.from?.id ||
            'global'

        const sequenceKey = `${msg.provider}:${msg.tenantId}:${userId}`

        if (!messagesByUser[sequenceKey]) {
            messagesByUser[sequenceKey] = []
        }
        messagesByUser[sequenceKey].push(message)
    }

    // Process each user's message sequence sequentially
    const processUserSequence = async (sequence: Message<WebhookQueueMessage>[]) => {
        for (const message of sequence) {
            await processSingleMessage(message, env, ctx)
        }
    }

    // Run all user sequences in parallel
    await Promise.allSettled(
        Object.values(messagesByUser).map(sequence => processUserSequence(sequence))
    )

    console.log(`[QueueConsumer] Batch complete. ${Object.keys(messagesByUser).length} unique user sequences processed.`)
}
