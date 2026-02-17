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

            // Log flow_start (Analytics) - Explicit flowId means START
            if (ctx.db && !session.currentFlowId && blueprint) {
                dbLogAnalyticsEvent({
                    db: ctx.db,
                    tenantId: ctx.tenantId,
                    botId: ctx.botId || 'unknown',
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
        // console.log(`[Engine] Loop: Step=${currentStepId} Executed=${stepsExecuted} Flow=${session.currentFlowId}`)
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
        const resolvedParams = injectVariablesDeep(step.params as Record<string, unknown>, ctx, session)

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
                console.log(`[Engine] Suspending at step ${currentStepId}`)

                // CRITICAL FIX: Ensure session reflects the step we are suspended at.
                // If we started via command (session.currentStepId=undefined) and suspended at entry_step,
                // we must save this so the next request is treated as RESUMING.
                if (currentStepId && currentStepId !== session.currentStepId) {
                    console.log(`[Engine] Updating session step to ${currentStepId} before suspending`)
                    const updateResult = await updateSessionAt(
                        kv.sessions,
                        ctx.tenantId,
                        ctx.provider,
                        ctx.userId,
                        {}, // No data changes here (data captured via resultData variables above if any)
                        { flowId: blueprint.id, stepId: currentStepId }
                    )
                    if (updateResult.success) {
                        session = updateResult.data
                    } else {
                        console.error(`[Engine] Failed to update session on suspend: ${updateResult.error}`)
                    }
                }

                // Stop execution, stay on this step
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
            console.log(`[Engine] Transitioning from ${currentStepId} to ${nextId}`)
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
            } else {
                console.error(`[Engine] Failed to update session for transition: ${updateResult.error}`)
            }

            currentStepId = nextId
            lastResult = result.data
            continue
        }

        // Handle Error
        // Handle Error
        if (!result.success) {
            // console.error(`[Engine] Step Error: ${step.action} (${currentStepId}) -> ${result.error}`)
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
