
import type { Blueprint, BotProvider } from '../../core/types'

export interface CompatibilityIssue {
    level: 'warning' | 'error'
    message: string
    stepId?: string
}

export interface CompatibilityResult {
    compatible: boolean
    level: 'safe' | 'warning' | 'error'
    issues: CompatibilityIssue[]
}

/**
 * Analyzes a blueprint for compatibility with a specific bot provider.
 * Focuses on identifying features that are degraded or unsupported on serverless/webhook platforms.
 */
export function analyzeCompatibility(blueprint: Blueprint, provider: BotProvider): CompatibilityResult {
    const issues: CompatibilityIssue[] = []

    // 1. Check for valid structure
    if (!blueprint.steps || typeof blueprint.steps !== 'object') {
        return {
            compatible: false,
            level: 'error',
            issues: [{ level: 'error', message: 'Blueprint structure invalid: missing steps object' }]
        }
    }

    // 2. Provider-specific checks
    if (provider === 'discord') {
        analyzeDiscordCompatibility(blueprint, issues)
    }

    // 3. Determine overall level
    let level: 'safe' | 'warning' | 'error' = 'safe'
    if (issues.some(i => i.level === 'error')) {
        level = 'error'
    } else if (issues.length > 0) {
        level = 'warning'
    }

    return {
        compatible: level !== 'error',
        level,
        issues
    }
}

function analyzeDiscordCompatibility(blueprint: Blueprint, issues: CompatibilityIssue[]) {
    // Check key: collect_input
    // Discord Webhooks cannot receive text messages.
    // We implemented a workaround (Button -> Modal), but this is a degraded UX compared to natural chat.

    // Steps is a Record<string, Step>, so we iterate entries to get ID
    const entries = Object.entries(blueprint.steps)

    for (const [id, step] of entries) {
        if (step.action === 'collect_input') {
            issues.push({
                level: 'warning',
                message: 'Uses "collect_input": Requires Bot Button & Modal interaction (Natural chat not supported on Webhooks).',
                stepId: id
            })
        }

        // Check key: timeout_seconds with wait
        // Discord interactions have a 3s hard timeout for the initial response.
        // Our engine handles this with deferred responses, but very long waits might be confusing if no intermediate msg is sent.
        // This is a soft warning.
        if (step.params && typeof step.params.timeout_seconds === 'number' && step.params.timeout_seconds > 60) {
            // Not a critical issue with our deferred architecture, but good to know.
            // Skipping for now to avoid noise, focusing on the input issue.
        }
    }
}
