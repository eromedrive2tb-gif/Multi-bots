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
} from '../../../core/types'
import { blueprintSchema } from '../../../core/types'
import { executeAction } from '../../molecules'
import { injectVariablesDeep } from '../../molecules'
import { getBlueprintByTriggerFromKv, getBlueprintFromKv } from '../../molecules'
import { getOrCreateSessionAt, updateSessionAt } from '../../molecules'
import { dbLogAnalyticsEvent } from '../../atoms'
import { dbCheckBlueprintActive } from '../../atoms'

// ============================================
// SAFE ANALYTICS HELPER
// ============================================

/**
 * Safely dispatch analytics logging respecting the Edge lifecycle.
 * Uses ctx.waitUntil() when available to prevent promise from being killed.
 * Falls back to fire-and-forget with .catch() as last resort.
 */
function safeLogAnalytics(
    ctx: UniversalContext,
    args: Parameters<typeof dbLogAnalyticsEvent>[0]
): void {
    const promise = dbLogAnalyticsEvent(args).catch(err =>
        console.error(`[Analytics] Failed to log ${args.eventType}:`, err)
    )
    if (ctx.waitUntil) {
        ctx.waitUntil(promise)
    }
}

// ============================================
// CONSTANTS
// ============================================

const MAX_STEPS_PER_EXECUTION = 100 // Prevent infinite loops

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
    const resolvedParams = injectVariablesDeep(step.params as Record<string, unknown>, ctx, session)

    // Create action context with metadata
    const actionCtx: UniversalContext = {
        ...ctx,
        metadata: {
            ...ctx.metadata,
            currentStepId: stepId,
            currentFlowId: session.currentFlowId
        }
    }

    // Auto-log step enter (Analytics) — safe lifecycle dispatch
    if (ctx.db && session.currentFlowId) {
        safeLogAnalytics(ctx, {
            db: ctx.db,
            tenantId: ctx.tenantId,
            botId: ctx.botId,
            blueprintId: session.currentFlowId,
            stepId: stepId,
            userId: ctx.userId,
            eventType: 'step_enter',
            eventData: { action: step.action }
        })
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
    // console.log('[Engine] Session loaded:', JSON.stringify(session))

    // Determine which flow to execute
    let blueprint: Blueprint | null = null

    if (flowId) {
        // Direct flow ID provided
        const bpResult = await getBlueprintFromKv(kv.blueprints, ctx.tenantId, flowId)
        if (bpResult.success) {
            // VALIDATE Blueprint structure
            const validation = blueprintSchema.safeParse(bpResult.data)
            if (!validation.success) {
                return { success: false, stepsExecuted: 0, error: `Invalid blueprint structure: ${validation.error.message}` }
            }
            blueprint = validation.data

            // Log flow_start (Analytics) — safe lifecycle dispatch
            if (ctx.db && !session.currentFlowId && blueprint) {
                safeLogAnalytics(ctx, {
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId || 'unknown',
                    blueprintId: blueprint.id,
                    stepId: 'flow_start',
                    userId: ctx.userId,
                    eventType: 'flow_start',
                    eventData: { method: 'direct_execution' }
                })
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
            // VALIDATE Blueprint structure
            const validation = blueprintSchema.safeParse(bpResult.data)
            if (!validation.success) {
                return { success: false, stepsExecuted: 0, error: `Invalid blueprint structure (trigger): ${validation.error.message}` }
            }
            const validatedBlueprint = validation.data

            // CHECK ACTIVATION if DB context is available (it should be for webhooks)
            let isActive = true
            if (ctx.db && ctx.botId) {
                isActive = await dbCheckBlueprintActive({
                    db: ctx.db,
                    botId: ctx.botId,
                    blueprintId: validatedBlueprint.id
                })
            }

            if (isActive) {
                //STRICT VALIDATION: Ensure the blueprint's trigger actually matches the command
                if (validatedBlueprint.trigger !== trigger) {
                    return {
                        success: false,
                        stepsExecuted: 0,
                        error: `Command trigger mismatch: requested '${trigger}' but blueprint has '${validatedBlueprint.trigger}'`,
                        blueprintId: validatedBlueprint.id
                    }
                }

                blueprint = validatedBlueprint
            } else {
                return {
                    success: false,
                    stepsExecuted: 0,
                    error: `Command '${trigger}' is disabled for this bot.`,
                    blueprintId: validatedBlueprint.id
                }
            }
        }
    } else if (session.currentFlowId) {
        // Resume from session
        const bpResult = await getBlueprintFromKv(kv.blueprints, ctx.tenantId, session.currentFlowId)
        if (bpResult.success) {
            // VALIDATE Blueprint structure
            const validation = blueprintSchema.safeParse(bpResult.data)
            if (!validation.success) {
                return { success: false, stepsExecuted: 0, error: `Invalid blueprint structure (session): ${validation.error.message}` }
            }
            blueprint = validation.data
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

            // NEW: Clear collected data on fresh trigger to avoid "ghost data" from previous runs
            session.collectedData = {}

            // Update session in KV immediately
            const saveResult = await updateSessionAt(
                kv.sessions,
                ctx.tenantId,
                ctx.provider,
                ctx.userId,
                {}, // No partial data, we already cleared session.collectedData in memory
                { flowId: blueprint.id, stepId: undefined }
            )
            if (saveResult.success) session = saveResult.data

            // Log flow_start (Analytics) — safe lifecycle dispatch
            if (ctx.db) {
                safeLogAnalytics(ctx, {
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId,
                    blueprintId: blueprint.id,
                    stepId: 'flow_start',
                    userId: ctx.userId,
                    eventType: 'flow_start',
                    eventData: { trigger: trigger }
                })
            }
        }
    }

    let currentStepId: string | null = startStepIdOverride ?? session.currentStepId ?? blueprint.entry_step
    let stepsExecuted = 0
    let lastResult: unknown = null
    let lastError: string | undefined
    let sessionChanged = false

    // Iterative execution loop (stack-safe)
    while (currentStepId && stepsExecuted < MAX_STEPS_PER_EXECUTION) {
        const step: BlueprintStep | undefined = blueprint.steps[currentStepId]

        if (!step) {
            lastError = `Step not found: ${currentStepId}`
            break
        }

        const isResuming = (stepsExecuted === 0 && currentStepId === session.currentStepId)

        // Inject variables into params
        const resolvedParams = injectVariablesDeep(step.params as Record<string, unknown>, ctx, session)

        if (isResuming) {
            resolvedParams['_is_resuming'] = true
        }

        // Execute the action via registry
        const result = await executeAction(step.action, ctx, resolvedParams)

        if (result.success) {
            stepsExecuted++
            sessionChanged = true

            // Log step_complete — safe lifecycle dispatch
            if (ctx.db && session.currentFlowId) {
                safeLogAnalytics(ctx, {
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId,
                    blueprintId: session.currentFlowId,
                    stepId: currentStepId!,
                    userId: ctx.userId,
                    eventType: 'step_complete',
                    eventData: { action: step.action }
                })
            }

            const resultData = result.data as any
            let nextId: string | null = step.next_step ?? null
            let shouldSuspend = false

            if (resultData && typeof resultData === 'object') {
                if (resultData.next_step) {
                    nextId = resultData.next_step
                }
                if (resultData.suspended) {
                    shouldSuspend = true
                }

                if (!resultData.suspended && !resultData.next_step && !resultData.condition_met) {
                    const { suspended, next_step, condition_met, ...vars } = resultData
                    if (Object.keys(vars).length > 0) {
                        // Batch session update in memory
                        session.collectedData = {
                            ...session.collectedData,
                            ...vars
                        }
                    }
                }
            }

            if (shouldSuspend) {
                console.log(`[Engine] Suspending at step ${currentStepId}`)
                session.currentStepId = currentStepId

                // CRITICAL: Must sync to KV on suspend
                await updateSessionAt(
                    kv.sessions,
                    ctx.tenantId,
                    ctx.provider,
                    ctx.userId,
                    session.collectedData,
                    { flowId: blueprint.id, stepId: currentStepId }
                )
                sessionChanged = false

                return {
                    success: true,
                    stepsExecuted,
                    lastStepId: currentStepId,
                    data: { suspended: true },
                    blueprintId: blueprint.id
                }
            }

            // Transition logic (in memory)
            session.currentStepId = nextId ?? undefined
            currentStepId = nextId
            lastResult = result.data

            // Sync heartbeat: Update KV every 10 steps to prevent loss on timeout
            if (stepsExecuted % 10 === 0) {
                await updateSessionAt(
                    kv.sessions,
                    ctx.tenantId,
                    ctx.provider,
                    ctx.userId,
                    session.collectedData,
                    { flowId: blueprint.id, stepId: currentStepId ?? undefined }
                )
                sessionChanged = false
            }

            continue
        }

        // Handle Error
        if (!result.success) {
            if (ctx.db && session.currentFlowId) {
                safeLogAnalytics(ctx, {
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId,
                    blueprintId: session.currentFlowId,
                    stepId: currentStepId || 'unknown',
                    userId: ctx.userId,
                    eventType: 'step_error',
                    eventData: { action: step.action, error: result.error }
                })
            }

            // Sync session before error stop
            await updateSessionAt(
                kv.sessions,
                ctx.tenantId,
                ctx.provider,
                ctx.userId,
                session.collectedData,
                { flowId: blueprint.id, stepId: currentStepId ?? undefined }
            )

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

    // Final Sync: Update KV after loop finishes
    if (sessionChanged) {
        await updateSessionAt(
            kv.sessions,
            ctx.tenantId,
            ctx.provider,
            ctx.userId,
            session.collectedData,
            { flowId: blueprint.id, stepId: currentStepId ?? undefined }
        )
    }

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
