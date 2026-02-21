/**
 * DOMAIN EVENTS
 * Strongly-typed event definitions for the Event Bus.
 * These are the contracts between the Engine core and domain subscribers.
 */

import type { ProviderType, UniversalContext } from './types'

// ============================================
// EVENT TYPES
// ============================================

export enum DomainEventType {
    // Engine lifecycle
    USER_INTERACTED = 'USER_INTERACTED',
    FLOW_COMPLETED = 'FLOW_COMPLETED',
    FLOW_ERROR = 'FLOW_ERROR',
    STEP_ERROR = 'STEP_ERROR',

    // VIP Groups
    BOT_ADDED_TO_GROUP = 'BOT_ADDED_TO_GROUP',
    BOT_REMOVED_FROM_GROUP = 'BOT_REMOVED_FROM_GROUP',
    USER_JOINED_GROUP = 'USER_JOINED_GROUP',
    USER_LEFT_GROUP = 'USER_LEFT_GROUP',
    USER_MESSAGE_IN_GROUP = 'USER_MESSAGE_IN_GROUP',
}

// ============================================
// EVENT ENVELOPE
// ============================================

export interface DomainEvent<T = unknown> {
    type: DomainEventType
    timestamp: number
    tenantId: string
    botId: string
    provider: ProviderType
    payload: T
}

// ============================================
// SPECIFIC PAYLOADS
// ============================================

export interface UserInteractedPayload {
    ctx: UniversalContext
}

export interface FlowCompletedPayload {
    ctx: UniversalContext
    blueprintId: string
    stepsExecuted: number
    collectedData?: Record<string, unknown>
}

export interface FlowErrorPayload {
    ctx: UniversalContext
    blueprintId: string
    error: string
    stepsExecuted: number
    lastStepId?: string
}

export interface StepErrorPayload {
    ctx: UniversalContext
    blueprintId: string
    stepId: string
    error: string
}

export interface BotGroupPayload {
    chatId: string
    chatTitle: string
    chatType: string
    botId: string
    fromUserId: string
    fromUsername?: string
    fromFirstName?: string
    date?: number
    raw?: unknown
}

export interface UserGroupPayload {
    chatId: string
    userId: string
    status: string
    username?: string
    firstName?: string
    botId: string
}

export interface UserMessageInGroupPayload {
    chatId: string
    userId: string
    username?: string
    fullName: string
    botId: string
}

// ============================================
// HELPER: Build Event
// ============================================

export function createDomainEvent<T>(
    type: DomainEventType,
    tenantId: string,
    botId: string,
    provider: ProviderType,
    payload: T
): DomainEvent<T> {
    return {
        type,
        timestamp: Date.now(),
        tenantId,
        botId,
        provider,
        payload,
    }
}
