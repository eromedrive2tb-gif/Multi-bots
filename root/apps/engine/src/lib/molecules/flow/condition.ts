import type { UniversalContext, Result } from '../../../core/types'

export async function condition(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const expression = String(params.expression)
    const trueStep = params.true_step as string | undefined
    const falseStep = params.false_step as string | undefined

    try {
        // Safe evaluation is hard, but for now we rely on the engine injecting values
        // literal strings like "plan_basic == 'plan_basic'" works

        // Basic comparison support: "a == b", "a != b", "a > b"
        // This is a naive implementation. For robust logic, use a proper expression parser.
        // But since engine injects values, we get "value == 'target'"

        // WARNING: Using Function/eval is dangerous. 
        // We implemented a safer basic comparator

        let result = false

        if (expression.includes('==')) {
            const [left, right] = expression.split('==').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            result = left == right
        } else if (expression.includes('!=')) {
            const [left, right] = expression.split('!=').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            result = left != right
        } else {
            // Check for boolean string "true"
            result = expression === 'true'
        }

        return {
            success: true,
            data: {
                condition_met: result,
                next_step: result ? trueStep : falseStep
            }
        }
    } catch (e) {
        return {
            success: false,
            error: `Condition error: ${e instanceof Error ? e.message : 'Unknown'}`
        }
    }
}
