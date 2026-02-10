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

        if (parts[0] === 'session') {
            if (parts[1]) {
                // Try to get from collectedData first (common case)
                let value = session.collectedData[parts[1]]

                // If not found, try root properties (e.g. currentStepId, currentFlowId)
                if (value === undefined && parts[1] in session) {
                    value = (session as any)[parts[1]]
                }

                return value !== undefined ? String(value) : ''
            }
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
import { dbLogAnalyticsEvent } from '../lib/atoms/database/db-log-analytics'
import { dbCheckBlueprintActive } from '../lib/atoms/database'

// ... existing imports ...

async function executeStep(
    step: BlueprintStep,
    stepId: string,
    ctx: UniversalContext,
    session: SessionData
): Promise<StepExecutionResult> {
    // Inject variables into params
    const resolvedParams = injectVariablesDeep(step.params, ctx, session)

    // Create action context with metadata
    const actionCtx: UniversalContext = {
        ...ctx,
        metadata: {
            ...ctx.metadata,
            currentStepId: stepId,
            currentFlowId: session.currentFlowId
        }
    }

    // DEBUG: Auto-log step enter if DB is available (Analytics)
    if (ctx.db && session.currentFlowId) {
        // We do this concurrently to not block execution
        dbLogAnalyticsEvent({
            db: ctx.db,
            tenantId: ctx.tenantId,
            botId: ctx.botId,
            blueprintId: session.currentFlowId,
            stepId: stepId,
            userId: ctx.userId,
            eventType: 'step_enter',
            eventData: {
                action: step.action
            }
        }).catch(err => console.error('Failed to log step_enter', err))
    }

    // Execute the action via registry
    const result = await executeAction(step.action, actionCtx, resolvedParams)

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
    blueprintId?: string
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
            blueprintId: undefined
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

            // Log flow_start (Analytics) - Explicit flowId means START
            if (ctx.db && !session.currentFlowId && blueprint) {
                dbLogAnalyticsEvent({
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.metadata.raw ? (ctx.metadata.raw as any).bot_id || 'unknown' : 'unknown',
                    blueprintId: blueprint.id,
                    stepId: 'flow_start',
                    userId: ctx.userId,
                    eventType: 'flow_start',
                    eventData: {
                        method: 'direct_execution'
                    }
                }).catch(err => console.error('Failed to log flow_start (direct)', err))
            }
        } else {
            return { success: false, stepsExecuted: 0, error: bpResult.error }
        }
    } else if (ctx.metadata.command) {
        // Trigger-based lookup (e.g., /start command)
        const trigger = `/${ctx.metadata.command}`
        const bpResult = await getBlueprintByTriggerFromKv(kv.blueprints, ctx.tenantId, trigger)

        if (!bpResult.success) {
            return { success: false, stepsExecuted: 0, error: bpResult.error }
        }

        if (bpResult.data) {
            // CHECK ACTIVATION if DB context is available (it should be for webhooks)
            let isActive = true
            if (ctx.db && ctx.botId) {
                // If the check fails (e.g. DB error), consider it active or inactive?
                // Let's be strict: If check explicitly returns false, then it is INACTIVE.
                // The atom returns false if row missing or is_active=0.
                isActive = await dbCheckBlueprintActive({
                    db: ctx.db,
                    botId: ctx.botId,
                    blueprintId: bpResult.data.id
                })
            }

            if (isActive) {
                //STRICT VALIDATION: Ensure the blueprint's trigger actually matches the command
                // This prevents "Ghost Triggers" (stale KV indices) from executing the wrong blueprint
                if (bpResult.data.trigger !== trigger) {
                    return {
                        success: false,
                        stepsExecuted: 0,
                        error: `Command trigger mismatch: requested '${trigger}' but blueprint has '${bpResult.data.trigger}'`,
                        blueprintId: bpResult.data.id
                    }
                }

                blueprint = bpResult.data
            } else {
                // Explicitly inactive for this bot
                return {
                    success: false,
                    stepsExecuted: 0,
                    error: `Command '${trigger}' is disabled for this bot.`,
                    blueprintId: bpResult.data.id
                }
            }
        }
        // If data is null, fall through to default "No blueprint found" at end of function
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
            blueprintId: undefined
        }
    }

    // Determine starting step
    let startStepIdOverride: string | undefined = startStepId

    // If triggered by command, force restart at entry_step
    if (ctx.metadata.command && blueprint.id) {
        // Only if we found a blueprint via trigger
        const trigger = `/${ctx.metadata.command}`
        // Check if this blueprint matches the trigger (it should, based on lookup above)
        if (blueprint.trigger === trigger) {
            startStepIdOverride = blueprint.entry_step
            // Important: Clear session current step to avoid "resuming" logic
            session.currentStepId = undefined
            session.currentFlowId = blueprint.id

            // Log flow_start (Analytics) - Only here, on explicit start
            if (ctx.db) {
                dbLogAnalyticsEvent({
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId,
                    blueprintId: blueprint.id,
                    stepId: 'flow_start',
                    userId: ctx.userId,
                    eventType: 'flow_start',
                    eventData: {
                        trigger: trigger
                    }
                }).catch(err => console.error('Failed to log flow_start', err))
            }
        }
    }

    let currentStepId: string | null = startStepIdOverride ?? session.currentStepId ?? blueprint.entry_step
    let stepsExecuted = 0
    let lastResult: unknown = null
    let lastError: string | undefined

    // Iterative execution loop (stack-safe)
    while (currentStepId && stepsExecuted < MAX_STEPS_PER_EXECUTION) {
        const step: BlueprintStep | undefined = blueprint.steps[currentStepId]

        if (!step) {
            lastError = `Step not found: ${currentStepId}`
            break
        }

        // Check if we are resuming execution on this step
        // This is true if we started the flow execution AT this step (from session)
        // rather than transitioning to it from a previous step in this run
        const isResuming = (stepsExecuted === 0 && currentStepId === session.currentStepId)

        // Inject variables into params
        const resolvedParams = injectVariablesDeep(step.params, ctx, session)

        // Inject resuming flag
        if (isResuming) {
            resolvedParams['_is_resuming'] = true
        }

        // Execute the action via registry
        const result = await executeAction(step.action, ctx, resolvedParams)

        // Handle success
        if (result.success) {
            stepsExecuted++ // Only count successful executions

            // Log step_complete
            if (ctx.db && session.currentFlowId) {
                dbLogAnalyticsEvent({
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId,
                    blueprintId: session.currentFlowId,
                    stepId: currentStepId!, // Use currentStepId from loop
                    userId: ctx.userId,
                    eventType: 'step_complete',
                    eventData: {
                        action: step.action
                    }
                }).catch(err => console.error('Failed to log step_complete', err))
            }

            const resultData = result.data as any
            let nextId: string | null = step.next_step ?? null
            let shouldSuspend = false

            // Check for dynamic overrides from action
            if (resultData && typeof resultData === 'object') {
                if (resultData.next_step) {
                    nextId = resultData.next_step
                }
                if (resultData.suspended) {
                    shouldSuspend = true
                }

                // Update collected variables if any
                // Molecules like set_variable or collect_input return data to save
                if (!resultData.suspended && !resultData.next_step && !resultData.condition_met) {
                    // Heuristic: if it returns data that isn't control flags, save it?
                    // Or explicit "variables" prop?
                    // For now, save everything that isn't reserved
                    const { suspended, next_step, condition_met, ...vars } = resultData
                    if (Object.keys(vars).length > 0) {
                        // Update session with new variables
                        const saveResult = await updateSessionAt(
                            kv.sessions,
                            ctx.tenantId,
                            ctx.provider,
                            ctx.userId,
                            vars
                        )
                        if (saveResult.success) session = saveResult.data
                    }
                }
            }

            if (shouldSuspend) {
                // Stop execution, stay on this step
                // Session already has this step as current (from previous update or initial)
                // Just return success
                return {
                    success: true,
                    stepsExecuted,
                    lastStepId: currentStepId,
                    data: { suspended: true },
                    blueprintId: blueprint.id
                }
            }

            // Proceed to next step
            // Update session with NEXT step
            const updateResult = await updateSessionAt(
                kv.sessions,
                ctx.tenantId,
                ctx.provider,
                ctx.userId,
                {},
                { flowId: blueprint.id, stepId: nextId ?? undefined }
            )

            if (updateResult.success) {
                session = updateResult.data
            }

            currentStepId = nextId
            lastResult = result.data
            continue
        }

        // Handle Error
        // ... (error handling logic remains similar)

        if (!result.success) {
            // Log step_error
            if (ctx.db && session.currentFlowId) {
                dbLogAnalyticsEvent({
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId,
                    blueprintId: session.currentFlowId,
                    stepId: currentStepId || 'unknown',
                    userId: ctx.userId,
                    eventType: 'step_error',
                    eventData: {
                        action: step.action,
                        error: result.error
                    }
                }).catch(err => console.error('Failed to log step_error', err))
            }

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
                blueprintId: blueprint.id
            }
        }
    }

    // Check for loop protection trigger
    if (stepsExecuted >= MAX_STEPS_PER_EXECUTION) {
        return {
            success: false,
            stepsExecuted,
            error: `Max steps (${MAX_STEPS_PER_EXECUTION}) exceeded - possible infinite loop`,
            blueprintId: blueprint?.id
        }
    }

    return {
        success: true,
        stepsExecuted,
        lastStepId: currentStepId ?? undefined,
        data: lastResult,
        blueprintId: blueprint?.id
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
