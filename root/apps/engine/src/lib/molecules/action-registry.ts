/**
 * ACTION REGISTRY
 * Maps action keys to provider-specific implementations
 * Implements the Action Proxy pattern for provider dispatch
 */

import type { UniversalContext, Result } from '../../core/types'

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
