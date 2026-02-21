/**
 * ORGANISM: TelegramWebhookHandler
 * Responsabilidade: Validate → Process (async) → HTTP 200 IMMEDIATELY
 * 
 * Strategy:
 * - ALWAYS returns HTTP 200 immediately to Telegram.
 * - Parallelizes initial bot validation and trigger matching.
 * - Processing runs in ctx.waitUntil() for instant response.
 * - Event Bus handles all side-effects (CRM, Analytics, VipGroups) with protection against duplicates.
 */

import { tgHandleUpdate, type TelegramUpdate } from '../../atoms'
import { dbGetBotById } from '../../atoms'
import { executeFromTrigger, type FlowExecutionResult } from '../'
import { getBlueprintByTriggerFromKv } from '../../molecules'
import type {
    TelegramCredentials,
    UniversalContext,
    Env
} from '../../../core/types'
import { DomainEventType, createDomainEvent } from '../../../core/domain-events'
import type {
    BotGroupPayload,
    UserGroupPayload,
    UserMessageInGroupPayload,
    UserInteractedPayload,
    FlowCompletedPayload,
    FlowErrorPayload,
} from '../../../core/domain-events'
import { dispatcher } from '../../../infra/events/EventDispatcher'

// ============================================
// WEBHOOK CONTEXT
// ============================================

export interface WebhookContext {
    env: Env
    botId: string
    tenantId: string
    waitUntil: (promise: Promise<any>) => void
}

export interface WebhookResult {
    handled: boolean
    flowResult?: FlowExecutionResult
    error?: string
}

// ============================================
// CORE PROCESSING (runs inside waitUntil)
// ============================================

async function processUpdate(
    update: TelegramUpdate,
    context: WebhookContext,
    token: string,
    initialBlueprintId?: string
): Promise<void> {
    const { env, botId, tenantId, waitUntil } = context

    // 1. Group events → Event Bus
    if (update.my_chat_member) {
        const m = update.my_chat_member
        const newStatus = m.new_chat_member.status
        const eventPayload: BotGroupPayload = {
            chatId: String(m.chat.id),
            chatTitle: m.chat.title || `Group ${m.chat.id}`,
            chatType: m.chat.type,
            botId,
            fromUserId: String(m.from.id),
            fromUsername: m.from.username,
            fromFirstName: m.from.first_name,
            date: m.date,
            raw: update,
        }
        const eventType = ['member', 'administrator', 'creator'].includes(newStatus)
            ? DomainEventType.BOT_ADDED_TO_GROUP
            : DomainEventType.BOT_REMOVED_FROM_GROUP
        dispatcher.emit(createDomainEvent(eventType, tenantId, botId, 'tg', eventPayload), env, waitUntil)
        return
    }

    if (update.chat_member) {
        const m = update.chat_member
        const newStatus = m.new_chat_member.status
        const eventPayload: UserGroupPayload = {
            chatId: String(m.chat.id),
            userId: String(m.new_chat_member.user.id),
            status: newStatus,
            username: m.new_chat_member.user.username,
            firstName: m.new_chat_member.user.first_name,
            botId,
        }
        const eventType = ['member', 'administrator', 'creator'].includes(newStatus)
            ? DomainEventType.USER_JOINED_GROUP
            : DomainEventType.USER_LEFT_GROUP
        dispatcher.emit(createDomainEvent(eventType, tenantId, botId, 'tg', eventPayload), env, waitUntil)
        return
    }

    // 2. Passive member upsert for group messages (in background)
    if (update.message && ['group', 'supergroup'].includes(update.message.chat.type)) {
        const msg = update.message
        const eventPayload: UserMessageInGroupPayload = {
            chatId: String(msg.chat.id),
            userId: String(msg.from.id),
            username: msg.from.username,
            fullName: [msg.from.first_name, (msg.from as any).last_name].filter(Boolean).join(' ') || 'Unknown',
            botId,
        }
        dispatcher.emit(createDomainEvent(DomainEventType.USER_MESSAGE_IN_GROUP, tenantId, botId, 'tg', eventPayload), env, waitUntil)
    }

    // 3. Build context for engine
    const parsed = tgHandleUpdate(update)
    if (!parsed.message) return

    const ctx: UniversalContext = {
        provider: 'tg',
        tenantId,
        userId: parsed.message.from.id,
        chatId: parsed.message.chatId,
        botToken: token,
        botId,
        db: env.DB,
        waitUntil,
        metadata: {
            userName: parsed.message.from.name,
            lastInput: parsed.message.text,
            command: parsed.isCommand ? parsed.command : undefined,
            raw: update,
        },
    }

    // 4. CRM: USER_INTERACTED (non-blocking)
    dispatcher.emit(
        createDomainEvent<UserInteractedPayload>(DomainEventType.USER_INTERACTED, tenantId, botId, 'tg', { ctx }),
        env, waitUntil
    )

    // 5. Trigger Resolution + Deep Linking
    let blueprintId = initialBlueprintId || 'unknown'

    if (blueprintId === 'unknown' && ctx.metadata.command) {
        let trigger = `/${ctx.metadata.command}`

        // Support for /start promo → /promo
        if (ctx.metadata.command === 'start' && ctx.metadata.lastInput) {
            const parts = ctx.metadata.lastInput.trim().split(/\s+/)
            if (parts.length >= 2) {
                const payload = parts[1]
                const potentialTrigger = payload.startsWith('/') ? payload : `/${payload}`
                const bpResult = await getBlueprintByTriggerFromKv(env.BLUEPRINTS_KV, tenantId, potentialTrigger)
                if (bpResult.success && bpResult.data) {
                    blueprintId = bpResult.data.id
                    ctx.metadata.command = potentialTrigger.replace('/', '')
                    ctx.metadata.lastInput = potentialTrigger
                }
            }
        }

        // Final check if not resolved by deep link
        if (blueprintId === 'unknown') {
            const bpResult = await getBlueprintByTriggerFromKv(env.BLUEPRINTS_KV, tenantId, trigger)
            if (bpResult.success && bpResult.data) {
                blueprintId = bpResult.data.id
            }
        }
    }

    // 6. Run Engine
    const result = await executeFromTrigger(
        { blueprints: env.BLUEPRINTS_KV, sessions: env.SESSIONS_KV },
        ctx
    )

    blueprintId = result.blueprintId || blueprintId

    // 7. Post-execution events (Analytics)
    if (blueprintId !== 'unknown') {
        if (result.success && !result.lastStepId) {
            dispatcher.emit(
                createDomainEvent<FlowCompletedPayload>(
                    DomainEventType.FLOW_COMPLETED, tenantId, botId, 'tg',
                    { ctx, blueprintId, stepsExecuted: result.stepsExecuted }
                ),
                env, waitUntil
            )
        } else if (result.error) {
            dispatcher.emit(
                createDomainEvent<FlowErrorPayload>(
                    DomainEventType.FLOW_ERROR, tenantId, botId, 'tg',
                    {
                        ctx, blueprintId,
                        error: result.error,
                        stepsExecuted: result.stepsExecuted,
                        lastStepId: result.lastStepId,
                    }
                ),
                env, waitUntil
            )
        }
    }
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

/**
 * Handle incoming Telegram webhook — Parallel Validate → Background Process → HTTP 200
 */
export async function handleTelegramWebhook(
    update: TelegramUpdate,
    context: WebhookContext
): Promise<WebhookResult> {
    try {
        const { botId, env, waitUntil, tenantId } = context

        // 1. Parallel Lookups: Bot credentials (D1) + Initial Trigger check (KV)
        // Shaves off ~100-200ms of sequential latency
        const [bot, bpResult] = await Promise.all([
            dbGetBotById({ db: env.DB, id: botId }),
            update.message?.text?.startsWith('/')
                ? getBlueprintByTriggerFromKv(env.BLUEPRINTS_KV, tenantId, update.message.text.split(' ')[0])
                : Promise.resolve(null)
        ])

        if (!bot) {
            return { handled: false, error: 'Bot not found' }
        }

        const credentials = bot.credentials as TelegramCredentials
        const token = credentials.token

        // Extract blueprintId safely from Result
        const initialBlueprintId = bpResult && bpResult.success ? bpResult.data?.id : undefined

        // 2. Process in background via waitUntil — Returns HTTP 200 immediately to TG
        waitUntil(
            processUpdate(update, context, token, initialBlueprintId).catch(err =>
                console.error('[Telegram Handler] Background processing error:', err)
            )
        )

        // 3. Return immediately
        return { handled: true }
    } catch (error) {
        console.error('[Telegram Handler] Error:', error)
        return {
            handled: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

// Wrapper for index export
export const TelegramWebhookHandler = {
    handle: handleTelegramWebhook
}
