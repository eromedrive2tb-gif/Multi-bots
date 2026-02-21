/**
 * EVENT SUBSCRIBER SETUP (Composition Root)
 * Registers all domain subscribers with the EventDispatcher singleton.
 * Called once during Worker initialization.
 */

import { dispatcher } from './EventDispatcher'
import { registerAnalyticsSubscriber } from './subscribers/AnalyticsSubscriber'
import { registerCrmSubscriber } from './subscribers/CrmSubscriber'
import { registerVipGroupSubscriber } from './subscribers/VipGroupSubscriber'

export function setupEventSubscribers(): void {
    // Clear existing subscribers to prevent duplicates during hot-reloading
    dispatcher.clear()

    registerAnalyticsSubscriber(dispatcher.on.bind(dispatcher))
    registerCrmSubscriber(dispatcher.on.bind(dispatcher))
    registerVipGroupSubscriber(dispatcher.on.bind(dispatcher))

    console.log('[EventBus] All subscribers registered.')
}
