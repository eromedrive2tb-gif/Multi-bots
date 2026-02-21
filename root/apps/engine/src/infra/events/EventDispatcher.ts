/**
 * EVENT DISPATCHER
 * In-process Event Bus that dispatches domain events to registered subscribers.
 * Each subscriber runs inside ctx.waitUntil() to extend the Worker lifecycle.
 * 
 * Design: Singleton module-level dispatcher. Subscribers register at import time.
 * 
 * Future: Can be upgraded to use Cloudflare Queues by replacing emit() with queue.send().
 */

import type { DomainEvent, DomainEventType } from '../../core/domain-events'
import type { Env } from '../../core/types'

// ============================================
// TYPES
// ============================================

export type EventSubscriber = (
    event: DomainEvent,
    env: Env
) => Promise<void>

// ============================================
// DISPATCHER
// ============================================

class EventDispatcher {
    private listeners = new Map<DomainEventType, EventSubscriber[]>()

    /**
     * Register a subscriber for a specific event type.
     */
    on(type: DomainEventType, subscriber: EventSubscriber): void {
        const existing = this.listeners.get(type) || []
        existing.push(subscriber)
        this.listeners.set(type, existing)
    }

    /**
     * Emit an event to all registered subscribers.
     * Each subscriber runs inside waitUntil() to survive the Worker return.
     * Subscribers NEVER block each other or the caller.
     */
    emit(
        event: DomainEvent,
        env: Env,
        waitUntil: (promise: Promise<any>) => void
    ): void {
        const subscribers = this.listeners.get(event.type)
        if (!subscribers || subscribers.length === 0) return

        for (const subscriber of subscribers) {
            waitUntil(
                subscriber(event, env).catch(err =>
                    console.error(
                        `[EventDispatcher] Subscriber failed for ${event.type}:`,
                        err instanceof Error ? err.message : err
                    )
                )
            )
        }
    }

    /**
     * List all registered event types (for debugging).
     */
    listEventTypes(): DomainEventType[] {
        return Array.from(this.listeners.keys())
    }

    /**
     * Clear all registered listeners (useful for hot-reloading or testing).
     */
    clear(): void {
        this.listeners.clear()
        console.log('[EventDispatcher] All listeners cleared.')
    }
}

// Singleton instance
export const dispatcher = new EventDispatcher()
