/**
 * EXECUTION ENGINE
 * The core engine that interprets and executes Blueprint flows
 * Provider-agnostic, resilient, and stack-safe
 */

import type {
    UniversalContext,
    Blueprint,
    BlueprintStep,
    SessionData,
    Result
} from './types'
import { executeAction } from './registry'
import { getBlueprintByTriggerFromKv, getBlueprintFromKv } from '../lib/molecules/kv-blueprint-manager'
import { getOrCreateSessionAt, updateSessionAt } from '../lib/molecules/kv-session-manager'

// ============================================
// CONSTANTS
// ============================================

const MAX_STEPS_PER_EXECUTION = 100 // Prevent infinite loops

// ============================================
// VARIABLE INJECTION
// ============================================

/**
 * Injects variables into a string template
 * Supports: {{user_name}}, {{last_input}}, {{session.field}}, {{ctx.field}}
 */
function injectVariables(
    template: string,
    ctx: UniversalContext,
    session: SessionData
): string {
    return template.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, key: string) => {
        // Handle dot notation for nested values
        const parts = key.split('.')

        if (parts[0] === 'session' && parts[1]) {
            const value = session.collectedData[parts[1]]
            return value !== undefined ? String(value) : ''
        }

        if (parts[0] === 'ctx' && parts[1]) {
            // Access known ctx properties safely
            const ctxKey = parts[1] as keyof UniversalContext
            if (ctxKey in ctx) {
                const ctxValue = ctx[ctxKey]
                return ctxValue !== undefined ? String(ctxValue) : ''
            }
            return ''
        }

        // Direct variable shortcuts
        switch (key) {
            case 'user_name':
                return ctx.metadata.userName ?? 'User'
            case 'last_input':
                return ctx.metadata.lastInput ?? ''
            case 'user_id':
                return ctx.userId
            case 'chat_id':
                return ctx.chatId
            case 'tenant_id':
                return ctx.tenantId
            case 'provider':
                return ctx.provider
            default:
                // Check session data as fallback
                const sessionValue = session.collectedData[key]
                return sessionValue !== undefined ? String(sessionValue) : match
        }
    })
}

/**
 * Recursively inject variables into all string values of an object
 */
function injectVariablesDeep(
    params: Record<string, unknown>,
    ctx: UniversalContext,
    session: SessionData
): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
            result[key] = injectVariables(value, ctx, session)
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = injectVariablesDeep(value as Record<string, unknown>, ctx, session)
        } else if (Array.isArray(value)) {
            result[key] = value.map(item =>
                typeof item === 'string'
                    ? injectVariables(item, ctx, session)
                    : item
            )
        } else {
            result[key] = value
        }
    }

    return result
}

// ============================================
// STEP EXECUTION
// ============================================

interface StepExecutionResult {
    success: boolean
    nextStepId: string | null
    data?: unknown
    error?: string
}

/**
 * Execute a single step from the blueprint
 */
async function executeStep(
    step: BlueprintStep,
    stepId: string,
    ctx: UniversalContext,
    session: SessionData
): Promise<StepExecutionResult> {
    // Inject variables into params
    const resolvedParams = injectVariablesDeep(step.params, ctx, session)

    // Execute the action via registry
    const result = await executeAction(step.action, ctx, resolvedParams)

    if (result.success) {
        return {
            success: true,
            nextStepId: step.next_step ?? null,
            data: result.data,
        }
    }

    // On error, try to use on_error step if defined
    if (step.on_error) {
        return {
            success: false,
            nextStepId: step.on_error,
            error: result.error,
        }
    }

    return {
        success: false,
        nextStepId: null,
        error: result.error,
    }
}

// ============================================
// FLOW EXECUTION
// ============================================

export interface FlowExecutionResult {
    success: boolean
    stepsExecuted: number
    lastStepId?: string
    error?: string
    data?: unknown
}

/**
 * Execute a complete flow from a blueprint
 * Uses iterative approach for Edge stack safety
 */
export async function executeFlow(
    kv: { blueprints: KVNamespace; sessions: KVNamespace },
    ctx: UniversalContext,
    flowId?: string,
    startStepId?: string
): Promise<FlowExecutionResult> {
    // Get or create session
    const sessionResult = await getOrCreateSessionAt(
        kv.sessions,
        ctx.tenantId,
        ctx.provider,
        ctx.userId
    )

    if (!sessionResult.success) {
        return {
            success: false,
            stepsExecuted: 0,
            error: sessionResult.error,
        }
    }

    let session = sessionResult.data

    // Determine which flow to execute
    let blueprint: Blueprint | null = null

    if (flowId) {
        // Direct flow ID provided
        const bpResult = await getBlueprintFromKv(kv.blueprints, ctx.tenantId, flowId)
        if (bpResult.success) {
            blueprint = bpResult.data
        } else {
            return { success: false, stepsExecuted: 0, error: bpResult.error }
        }
    } else if (ctx.metadata.command) {
        // Trigger-based lookup (e.g., /start command)
        const trigger = `/${ctx.metadata.command}`
        const bpResult = await getBlueprintByTriggerFromKv(kv.blueprints, ctx.tenantId, trigger)
        if (bpResult.success) {
            blueprint = bpResult.data
        } else {
            return { success: false, stepsExecuted: 0, error: bpResult.error }
        }
    } else if (session.currentFlowId) {
        // Resume from session
        const bpResult = await getBlueprintFromKv(kv.blueprints, ctx.tenantId, session.currentFlowId)
        if (bpResult.success) {
            blueprint = bpResult.data
        }
    }

    if (!blueprint) {
        return {
            success: false,
            stepsExecuted: 0,
            error: 'No blueprint found for this trigger or session',
        }
    }

    // Determine starting step
    let currentStepId: string | null = startStepId ?? session.currentStepId ?? blueprint.entry_step
    let stepsExecuted = 0
    let lastResult: unknown = null
    let lastError: string | undefined

    // Iterative execution loop (stack-safe)
    while (currentStepId && stepsExecuted < MAX_STEPS_PER_EXECUTION) {
        const step = blueprint.steps[currentStepId]

        if (!step) {
            lastError = `Step not found: ${currentStepId}`
            break
        }

        // Execute the step
        const result = await executeStep(step, currentStepId, ctx, session)
        stepsExecuted++

        // Update session with current position
        const updateResult = await updateSessionAt(
            kv.sessions,
            ctx.tenantId,
            ctx.provider,
            ctx.userId,
            {},
            { flowId: blueprint.id, stepId: result.nextStepId ?? undefined }
        )

        if (updateResult.success) {
            session = updateResult.data
        }

        if (!result.success) {
            // Check for error_handler step in blueprint
            if (blueprint.steps['error_handler'] && currentStepId !== 'error_handler') {
                currentStepId = 'error_handler'
                lastError = result.error
                continue
            }

            return {
                success: false,
                stepsExecuted,
                lastStepId: currentStepId,
                error: result.error,
            }
        }

        lastResult = result.data
        currentStepId = result.nextStepId
    }

    // Check for loop protection trigger
    if (stepsExecuted >= MAX_STEPS_PER_EXECUTION) {
        return {
            success: false,
            stepsExecuted,
            error: `Max steps (${MAX_STEPS_PER_EXECUTION}) exceeded - possible infinite loop`,
        }
    }

    return {
        success: true,
        stepsExecuted,
        lastStepId: currentStepId ?? undefined,
        data: lastResult,
    }
}

/**
 * Execute flow from a trigger (command)
 * Convenience wrapper for webhook handlers
 */
export async function executeFromTrigger(
    kv: { blueprints: KVNamespace; sessions: KVNamespace },
    ctx: UniversalContext
): Promise<FlowExecutionResult> {
    return executeFlow(kv, ctx)
}
