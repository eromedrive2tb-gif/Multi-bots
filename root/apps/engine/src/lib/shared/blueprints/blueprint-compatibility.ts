
import type { Blueprint, BotProvider } from '../../../core/types'

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
    // Discord Webhooks cannot receive text messages naturally.
    // We implemented a workaround (Button -> Modal).

    let hasCollectInput = false
    const stepsWithLongTimeout: string[] = []

    const entries = Object.entries(blueprint.steps)

    for (const [id, step] of entries) {
        if (step.action === 'collect_input') {
            hasCollectInput = true
        }

        // Check for long timeouts (Discord interaction limit is 3s, but we use deferred)
        // However, extremely long processing without updates might still be an issue conceptually
        // Not a hard error, just a heads up.
    }

    if (hasCollectInput) {
        issues.push({
            level: 'warning',
            message: '⚠️ Adaptação Automática: Este fluxo solicita texto do usuário via "collect_input". O Discord não permite isso nativamente em webhooks. O bot enviará um botão "Responder" que abre um formulário.'
        })
    }

    if (stepsWithLongTimeout.length > 0) {
        issues.push({
            level: 'warning',
            message: '⚠️ Latência: Alguns passos têm espera longa. O Discord exige resposta em 3s (o sistema tenta adiar, mas evite processamento pesado sem feedback).'
        })
    }
}
