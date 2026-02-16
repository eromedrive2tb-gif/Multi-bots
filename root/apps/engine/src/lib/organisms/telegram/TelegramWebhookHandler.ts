/**
 * ORGANISM: TelegramWebhookHandler
 * Responsabilidade: Processa webhooks do Telegram via Engine data-driven
 * Orquestra: Engine, Session, tg-handle-update, Analytics, CRM
 * 
 * REFACTORED: All command logic moved to Blueprint JSONs
 */

import { tgHandleUpdate, type TelegramUpdate } from '../../atoms'
import { dbGetBotById } from '../../atoms'
import { dbLogAnalyticsEvent } from '../../atoms'
import { executeFromTrigger, type FlowExecutionResult } from '../'
import { getBlueprintByTriggerFromKv, getBlueprintFromKv } from '../../molecules'
import { upsertCustomer, logCustomerSnapshot } from '../../molecules'  // Import CRM molecule
import type {
    TelegramCredentials,
    UniversalContext,
    Env
} from '../../../core/types'

// ============================================
// ANALYTICS LOGGING HELPER
// ============================================

/**
 * Log analytics events after flow execution
 */
async function logFlowAnalytics(
    db: D1Database,
    tenantId: string,
    botId: string,
    blueprintId: string,
    userId: string,
    flowResult: FlowExecutionResult
): Promise<void> {
    try {
        // Log flow_complete event
        if (flowResult.success && flowResult.stepsExecuted > 0 && !flowResult.lastStepId) {
            // Flow completed (reached null next_step)
            await dbLogAnalyticsEvent({
                db,
                tenantId,
                botId,
                blueprintId,
                stepId: 'flow_complete',
                userId,
                eventType: 'flow_complete',
                eventData: {
                    stepsExecuted: flowResult.stepsExecuted,
                }
            })
        }

        // Log flow error if present
        if (flowResult.error) {
            await dbLogAnalyticsEvent({
                db,
                tenantId,
                botId,
                blueprintId,
                stepId: flowResult.lastStepId || 'unknown',
                userId,
                eventType: 'step_error',
                eventData: {
                    error: flowResult.error,
                    stepsExecuted: flowResult.stepsExecuted
                }
            })
        }
    } catch (error) {
        // Don't fail the webhook if analytics logging fails
        console.error('[Analytics] Error logging flow analytics:', error)
    }
}

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
// CONTEXT BUILDER
// ============================================

/**
 * Converts a Telegram update to UniversalContext
 */
function buildUniversalContext(
    update: TelegramUpdate,
    tenantId: string,
    botToken: string,
    db: D1Database,
    botId: string
): UniversalContext | null {
    const parsed = tgHandleUpdate(update)

    if (!parsed.message) {
        return null
    }

    return {
        provider: 'tg',
        tenantId,
        userId: parsed.message.from.id,
        chatId: parsed.message.chatId,
        botToken,
        botId,
        db,
        metadata: {
            userName: parsed.message.from.name,
            lastInput: parsed.message.text,
            command: parsed.isCommand ? parsed.command : undefined,
            raw: update,
        },
    }
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

/**
 * Handle incoming Telegram webhook - Data-driven
 */
export async function handleTelegramWebhook(
    update: TelegramUpdate,
    context: WebhookContext
): Promise<WebhookResult> {
    console.log('[Telegram Debug] Incoming Webhook Update:', JSON.stringify(update))
    try {
        // 1. Get bot credentials
        const bot = await dbGetBotById({ db: context.env.DB, id: context.botId })
        if (!bot) {
            return {
                handled: false,
                error: 'Bot not found'
            }
        }

        const credentials = bot.credentials as TelegramCredentials
        const token = credentials.token

        // 1.5 Handle my_chat_member (Bot added/removed from group)
        if (update.my_chat_member) {
            const memberUpdate = update.my_chat_member
            const newStatus = memberUpdate.new_chat_member.status
            const chatId = String(memberUpdate.chat.id)
            const chatTitle = memberUpdate.chat.title || `Group ${chatId}`
            const chatType = memberUpdate.chat.type

            console.log(`[Telegram] my_chat_member update: ${newStatus} for chat ${chatId} (${chatTitle})`)

            const { VipGroupService } = await import('../groups/VipGroupService')
            const vipService = new VipGroupService(context.env.DB, context.tenantId)

            if (['member', 'administrator', 'creator'].includes(newStatus)) {
                // Bot added to group/channel
                console.log(`[Telegram] Auto-registering group ${chatId}`)
                const groupRes = await vipService.registerGroup({
                    name: chatTitle,
                    provider: 'telegram',
                    providerId: chatId,
                    type: chatType === 'channel' ? 'channel' : 'group',
                    botId: context.botId,
                    metadata: {
                        auto_added: true,
                        added_by: memberUpdate.from.id,
                        date: memberUpdate.date
                    }
                })

                // Also add the user who added it as a member/admin
                if (groupRes.success && groupRes.data) {
                    await vipService.addMember({
                        groupId: groupRes.data.id,
                        customerId: String(memberUpdate.from.id),
                        status: 'administrator',
                        provider: 'tg',
                        tenantId: context.tenantId,
                        name: memberUpdate.from.first_name,
                        username: memberUpdate.from.username
                    })
                }
            } else if (['left', 'kicked'].includes(newStatus)) {
                // Bot removed from group
                console.log(`[Telegram] Auto-removing group ${chatId}`)
                const groups = await vipService.listGroups()
                if (groups.success && groups.data) {
                    const group = groups.data.find(g => g.providerId === chatId && g.provider === 'telegram')
                    if (group) {
                        await vipService.deleteGroup(group.id)
                    }
                }
            }

            return { handled: true }
        }

        // 1.6 Handle chat_member (User joined/left)
        if (update.chat_member) {
            const memberUpdate = update.chat_member
            const newStatus = memberUpdate.new_chat_member.status
            const chatId = String(memberUpdate.chat.id)
            const userId = String(memberUpdate.new_chat_member.user.id)

            console.log(`[Telegram] chat_member update: ${newStatus} for user ${userId} in chat ${chatId}`)

            const { VipGroupService } = await import('../groups/VipGroupService')
            const vipService = new VipGroupService(context.env.DB, context.tenantId)

            // Find the internal group ID
            const groups = await vipService.listGroups()
            if (groups.success && groups.data) {
                const group = groups.data.find(g => g.providerId === chatId && g.provider === 'telegram')

                if (group) {
                    if (['member', 'administrator', 'creator'].includes(newStatus)) {
                        await vipService.addMember({
                            groupId: group.id,
                            customerId: userId,
                            status: newStatus as any,
                            provider: 'tg',
                            tenantId: context.tenantId,
                            username: memberUpdate.new_chat_member.user.username,
                            name: memberUpdate.new_chat_member.user.first_name || 'Unknown'
                        })
                    } else if (['left', 'kicked'].includes(newStatus)) {
                        await vipService.updateMemberStatus(group.id, userId, newStatus as any)
                    }
                }
            }

            return { handled: true }
        }

        // 1.7 Passive Member Upsert (Message in Group)
        // If it's a message in a group/supergroup, upsert the member
        if (update.message && ['group', 'supergroup'].includes(update.message.chat.type)) {
            const chatId = String(update.message.chat.id)
            const userId = String(update.message.from.id)

            // Run in background to not block response
            context.waitUntil((async () => {
                const { VipGroupService } = await import('../groups/VipGroupService')
                const vipService = new VipGroupService(context.env.DB, context.tenantId)

                // We need to check if this group is tracked.
                // Optimisation: querying listGroups every message is heavy.
                // Ideally we'd have a KV cache or simple "is this a VIP group" check.
                // For now, we stick to the DB check but wrapped in waitUntil.
                const groups = await vipService.listGroups()
                if (groups.success && groups.data) {
                    const group = groups.data.find(g => g.providerId === chatId && g.provider === 'telegram')
                    if (group) {
                        await vipService.addMember({
                            groupId: group.id,
                            customerId: userId,
                            status: 'member', // Assumed member if talking
                            provider: 'tg',
                            tenantId: context.tenantId,
                            username: update.message!.from.username,
                            name: [update.message!.from.first_name, (update.message!.from as any).last_name].filter(Boolean).join(' ') || 'Unknown'
                        })
                    }
                }
            })())
        }

        // 2. Build UniversalContext
        const ctx = buildUniversalContext(update, context.tenantId, token, context.env.DB, context.botId)

        if (!ctx) {
            return { handled: false }
        }

        // 2.1 CRM: Upsert Customer (Background)
        // Fire and forget, no await
        context.waitUntil(upsertCustomer(ctx, context.env))

        // 3. Try to get the blueprintId for analytics (before execution for starting flows)
        let blueprintId = 'unknown'
        if (ctx.metadata.command) {
            let trigger = `/${ctx.metadata.command}`

            // FIX: Deep Linking Support
            // If command is /start and has arguments, specifically check if those arguments match a trigger
            // e.g. t.me/Bot?start=promo -> /start promo -> trigger: /promo
            if (ctx.metadata.command === 'start' && ctx.metadata.lastInput) {
                const parts = ctx.metadata.lastInput.trim().split(/\s+/)
                if (parts.length >= 2) {
                    const payload = parts[1]
                    // If payload starts with / use it, else prepend /
                    const potentialTrigger = payload.startsWith('/') ? payload : `/${payload}`

                    // Check if this specific trigger exists
                    const bpResult = await getBlueprintByTriggerFromKv(context.env.BLUEPRINTS_KV, context.tenantId, potentialTrigger)
                    if (bpResult.success && bpResult.data) {
                        trigger = potentialTrigger
                        // Update context command to match the deep link trigger so engine executes it
                        // We need to hack the context logic slightly or just rely on executeFromTrigger handling it?
                        // executeFromTrigger uses ctx.metadata.command usually... or it uses the trigger passed to it?
                        // Actually executeFromTrigger calculates trigger internally from ctx.metadata.command.
                        // We might need to update ctx.metadata.command to the new command.
                        ctx.metadata.command = potentialTrigger.replace('/', '')
                        ctx.metadata.lastInput = potentialTrigger // Pretend user typed /promo
                    }
                }
            }

            const bpResult = await getBlueprintByTriggerFromKv(context.env.BLUEPRINTS_KV, context.tenantId, trigger)
            if (bpResult.success && bpResult.data) {
                blueprintId = bpResult.data.id
            }
        }

        // 4. Run Engine
        const result = await executeFromTrigger(
            {
                blueprints: context.env.BLUEPRINTS_KV,
                sessions: context.env.SESSIONS_KV,
            },
            ctx
        )

        // Update blueprintId from execution result if available
        if (result.blueprintId) {
            blueprintId = result.blueprintId
        }

        // 5. Log analytics events
        if (blueprintId !== 'unknown') {
            await logFlowAnalytics(
                context.env.DB,
                context.tenantId,
                context.botId,
                blueprintId,
                String(ctx.userId),
                result
            )

            // 5.1 CRM: Log history snapshot if flow completed successfully
            if (result.success && !result.lastStepId) {
                // Fetch latest session data again to ensure we have all vars
                const { getOrCreateSessionAt } = await import('../../molecules')
                const sessionRes = await getOrCreateSessionAt(context.env.SESSIONS_KV, context.tenantId, ctx.provider, String(ctx.userId))

                if (sessionRes.success) {
                    context.waitUntil(logCustomerSnapshot(
                        ctx,
                        context.env,
                        blueprintId,
                        sessionRes.data.collectedData
                    ))
                }
            }
        }

        return {
            handled: true,
            flowResult: result
        }
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
