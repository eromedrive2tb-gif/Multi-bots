/**
 * VARIABLE INJECTOR MOLECULE
 * Handles template string interpolation for the execution engine
 */

import type { UniversalContext, SessionData } from '../../core/types'

/**
 * Injects variables into a string template
 * Supports: {{user_name}}, {{last_input}}, {{session.field}}, {{ctx.field}}
 */
export function injectVariables(
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
export function injectVariablesDeep(
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
