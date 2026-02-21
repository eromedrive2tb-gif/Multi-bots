/**
 * COMMAND REGISTRY
 * Maps WebSocket action keys to isolated Command Handlers.
 * Mirrors the action-registry.ts pattern used by the Engine.
 * 
 * Each handler receives (env, payload, meta) and returns a standard result.
 */

import type { Env } from '../../../core/types'

// ============================================
// COMMAND HANDLER SIGNATURE
// ============================================

export interface CommandMeta {
    tenantId: string
    userId: string
}

export interface CommandResult {
    success: boolean
    data?: unknown
    error?: string
}

export type CommandHandler = (
    env: Env,
    payload: any,
    meta: CommandMeta
) => Promise<CommandResult>

// ============================================
// REGISTRY MAP
// ============================================

const COMMAND_REGISTRY = new Map<string, CommandHandler>()

// ============================================
// REGISTRY API
// ============================================

/**
 * Register a command handler for a given action key.
 * Supports registering multiple action keys to the same handler.
 */
export function registerCommand(key: string, handler: CommandHandler): void {
    COMMAND_REGISTRY.set(key, handler)
}

/**
 * Resolve a handler by action key.
 */
export function resolveCommand(key: string): CommandHandler | undefined {
    return COMMAND_REGISTRY.get(key)
}

/**
 * List all registered command keys (for debugging).
 */
export function listCommands(): string[] {
    return Array.from(COMMAND_REGISTRY.keys())
}
