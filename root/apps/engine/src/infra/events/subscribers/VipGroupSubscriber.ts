/**
 * SUBSCRIBER: VIP Groups
 * Reacts to: BOT_ADDED_TO_GROUP, BOT_REMOVED_FROM_GROUP,
 *            USER_JOINED_GROUP, USER_LEFT_GROUP, USER_MESSAGE_IN_GROUP
 * 
 * Extracted from TelegramWebhookHandler (~120 lines of inline VipGroupService logic)
 */

import type { DomainEvent } from '../../../core/domain-events'
import { DomainEventType } from '../../../core/domain-events'
import type {
    BotGroupPayload,
    UserGroupPayload,
    UserMessageInGroupPayload
} from '../../../core/domain-events'
import type { Env } from '../../../core/types'
import { VipGroupService } from '../../../lib/organisms'

export function registerVipGroupSubscriber(
    on: (type: DomainEventType, handler: (event: DomainEvent, env: Env) => Promise<void>) => void
): void {
    // BOT_ADDED_TO_GROUP → auto-register group + add admin
    on(DomainEventType.BOT_ADDED_TO_GROUP, async (event, env) => {
        const p = event.payload as BotGroupPayload
        const vipService = new VipGroupService(env.DB, event.tenantId)

        console.log(`[VipSubscriber] Auto-registering group ${p.chatId}`)

        const groupRes = await vipService.registerGroup({
            name: p.chatTitle,
            provider: 'telegram',
            providerId: p.chatId,
            type: p.chatType === 'channel' ? 'channel' : 'group',
            botId: p.botId,
            metadata: {
                auto_added: true,
                added_by: p.fromUserId,
                date: p.date,
            }
        })

        // Also add the user who added the bot as admin
        if (groupRes.success && groupRes.data) {
            await vipService.addMember({
                groupId: groupRes.data.id,
                customerId: p.fromUserId,
                status: 'administrator',
                provider: 'tg',
                tenantId: event.tenantId,
                name: p.fromFirstName || 'Unknown',
                username: p.fromUsername,
            })
        }
    })

    // BOT_REMOVED_FROM_GROUP → auto-delete group
    on(DomainEventType.BOT_REMOVED_FROM_GROUP, async (event, env) => {
        const p = event.payload as BotGroupPayload
        const vipService = new VipGroupService(env.DB, event.tenantId)

        console.log(`[VipSubscriber] Auto-removing group ${p.chatId}`)

        const groups = await vipService.listGroups()
        if (groups.success && groups.data) {
            const group = groups.data.find(g => g.providerId === p.chatId && g.provider === 'telegram')
            if (group) {
                await vipService.deleteGroup(group.id)
            }
        }
    })

    // USER_JOINED_GROUP → add member
    on(DomainEventType.USER_JOINED_GROUP, async (event, env) => {
        const p = event.payload as UserGroupPayload
        const vipService = new VipGroupService(env.DB, event.tenantId)

        // Find internal group by provider ID
        const groups = await vipService.listGroups()
        if (groups.success && groups.data) {
            const group = groups.data.find(g => g.providerId === p.chatId && g.provider === 'telegram')
            if (group) {
                await vipService.addMember({
                    groupId: group.id,
                    customerId: p.userId,
                    status: p.status as any,
                    provider: 'tg',
                    tenantId: event.tenantId,
                    username: p.username,
                    name: p.firstName || 'Unknown',
                })
            }
        }
    })

    // USER_LEFT_GROUP → update member status
    on(DomainEventType.USER_LEFT_GROUP, async (event, env) => {
        const p = event.payload as UserGroupPayload
        const vipService = new VipGroupService(env.DB, event.tenantId)

        const groups = await vipService.listGroups()
        if (groups.success && groups.data) {
            const group = groups.data.find(g => g.providerId === p.chatId && g.provider === 'telegram')
            if (group) {
                await vipService.updateMemberStatus(group.id, p.userId, p.status as any)
            }
        }
    })

    // USER_MESSAGE_IN_GROUP → passive member upsert
    on(DomainEventType.USER_MESSAGE_IN_GROUP, async (event, env) => {
        const p = event.payload as UserMessageInGroupPayload
        const vipService = new VipGroupService(env.DB, event.tenantId)

        const groups = await vipService.listGroups()
        if (groups.success && groups.data) {
            const group = groups.data.find(g => g.providerId === p.chatId && g.provider === 'telegram')
            if (group) {
                await vipService.addMember({
                    groupId: group.id,
                    customerId: p.userId,
                    status: 'member',
                    provider: 'tg',
                    tenantId: event.tenantId,
                    username: p.username,
                    name: p.fullName,
                })
            }
        }
    })

    console.log('[EventBus] VipGroupSubscriber registered.')
}
