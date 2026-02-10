import { z } from 'zod'

// ============================================
// ANALYTICS EVENT TYPES
// ============================================

export type AnalyticsEventType =
    | 'step_enter'
    | 'step_complete'
    | 'step_error'
    | 'flow_start'
    | 'flow_complete'
    | 'flow_abandon'
    | 'button_click'

export enum ErrorSeverity {
    LOW = 1,      // User Input / Config Errors (e.g. Mismatch)
    MEDIUM = 2,   // Warnings / Recoverable
    HIGH = 3,     // Standard Runtime Errors
    CRITICAL = 4  // System Failures / Unknown Errors
}


export const analyticsEventTypeSchema = z.enum([
    'step_enter',
    'step_complete',
    'step_error',
    'flow_start',
    'flow_complete',
    'flow_abandon',
    'button_click'
])

// ============================================
// ANALYTICS EVENT ENTITY
// ============================================

export interface AnalyticsEvent {
    id: string
    tenantId: string
    botId: string
    blueprintId: string
    stepId: string
    userId: string
    eventType: AnalyticsEventType
    eventData?: Record<string, unknown>
    createdAt: Date
}

// ============================================
// AGGREGATED METRICS
// ============================================

export interface OverviewMetrics {
    totalBots: number
    activeBots: number
    totalBlueprints: number
    activeBlueprints: number
    totalFlowStarts: number
    totalFlowCompletions: number
    completionRate: number
    totalErrors: number
}

export interface BlueprintMetric {
    blueprintId: string
    blueprintName: string
    trigger: string
    isActive: boolean
    flowStarts: number
    flowCompletions: number
    completionRate: number
    avgStepsCompleted: number
    topDropoffStep?: string
    totalErrors: number
}

export interface BotMetric {
    botId: string
    botName: string
    provider: 'telegram' | 'discord'
    status: 'online' | 'offline' | 'error'
    totalFlows: number
    totalUsers: number
    lastActivity?: Date
}

export interface StepMetric {
    stepId: string
    stepType: 'atom' | 'molecule' | 'organism'
    action: string
    entranceCount: number
    completionCount: number
    errorCount: number
    dropoffRate: number
}

export interface FunnelData {
    blueprintId: string
    blueprintName: string
    steps: {
        stepId: string
        label: string
        count: number
        percentage: number
    }[]
}

// ============================================
// FILTER PARAMS
// ============================================

export interface AnalyticsFilterParams {
    botId?: string
    blueprintId?: string
    dateFrom?: string
    dateTo?: string
    status?: 'active' | 'inactive' | 'all'
}

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

export const analyticsFilterSchema = z.object({
    botId: z.string().optional(),
    blueprintId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
})

export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>

export const logAnalyticsEventSchema = z.object({
    tenantId: z.string().min(1),
    botId: z.string().min(1),
    blueprintId: z.string().min(1),
    stepId: z.string().min(1),
    userId: z.string().min(1),
    eventType: analyticsEventTypeSchema,
    eventData: z.record(z.string(), z.unknown()).optional(),
})

export type LogAnalyticsEventInput = z.infer<typeof logAnalyticsEventSchema>
