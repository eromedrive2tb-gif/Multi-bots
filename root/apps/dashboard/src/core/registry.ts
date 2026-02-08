/**
 * ACTION REGISTRY
 * Maps action keys to provider-specific implementations
 * Implements the Action Proxy pattern for provider dispatch
 */

import type { UniversalContext, Result } from './types'

import { setVariable } from '../lib/molecules/set-variable'
import { condition } from '../lib/molecules/condition'
import { collectInput } from '../lib/molecules/collect-input'
import { inlineKeyboard } from '../lib/molecules/inline-keyboard'

// ============================================
// ACTION FUNCTION SIGNATURE
// ============================================

export type ActionFn = (
    ctx: UniversalContext,
    params: Record<string, unknown>
) => Promise<Result<unknown>>

// ============================================
// ACTION REGISTRY MAP
// ============================================

const ACTION_REGISTRY: Map<string, ActionFn> = new Map()

// ============================================
// PROVIDER-SPECIFIC IMPLEMENTATIONS
// ============================================

import { sendMessage } from '../lib/molecules/send-message'


/**
 * wait - Delays execution (useful for flow pacing)
 */
async function wait(
    _ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const ms = Number(params.ms ?? params.milliseconds ?? 1000)

    // Edge-safe delay using scheduler or promise
    await new Promise(resolve => setTimeout(resolve, Math.min(ms, 10000)))

    return { success: true, data: { waited: ms } }
}

/**
 * log - Debug logging action (logs to console or external service)
 */
async function log(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const message = String(params.message ?? '')
    const level = String(params.level ?? 'info')

    console.log(`[${level.toUpperCase()}] [${ctx.tenantId}] [${ctx.provider}:${ctx.userId}] ${message}`)

    return { success: true, data: { logged: true } }
}

// ============================================
// REGISTER ACTIONS
// ============================================

ACTION_REGISTRY.set('send_message', sendMessage)
ACTION_REGISTRY.set('wait', wait)
ACTION_REGISTRY.set('log', log)
ACTION_REGISTRY.set('set_variable', setVariable)
ACTION_REGISTRY.set('condition', condition)
ACTION_REGISTRY.set('collect_input', collectInput)
ACTION_REGISTRY.set('inline_keyboard', inlineKeyboard)

// ============================================
// REGISTRY API
// ============================================

/**
 * Resolves and returns the action function for a given action key
 */
export function resolveAction(actionKey: string): ActionFn | undefined {
    return ACTION_REGISTRY.get(actionKey)
}

/**
 * Executes an action by key with the given context and params
 */
export async function executeAction(
    actionKey: string,
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const action = resolveAction(actionKey)

    if (!action) {
        return { success: false, error: `Action not found: ${actionKey}` }
    }

    try {
        return await action(ctx, params)
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : `Error executing action: ${actionKey}`,
        }
    }
}

/**
 * Registers a new action to the registry
 * Used for extending the engine with custom atoms/molecules
 */
export function registerAction(key: string, fn: ActionFn): void {
    ACTION_REGISTRY.set(key, fn)
}

/**
 * Lists all registered action keys
 */
export function listActions(): string[] {
    return Array.from(ACTION_REGISTRY.keys())
}
