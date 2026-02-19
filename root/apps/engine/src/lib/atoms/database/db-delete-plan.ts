import { Result } from '../../../core/types'

export interface DbDeletePlanProps {
    db: D1Database
    planId: string
    tenantId: string
}

export async function dbDeletePlan({ db, planId, tenantId }: DbDeletePlanProps): Promise<Result<boolean>> {
    try {
        const result = await db.prepare(
            `UPDATE plans SET is_active = 0, updated_at = ? WHERE id = ? AND tenant_id = ?`
        ).bind(new Date().toISOString(), planId, tenantId).run()

        if ((result.meta?.changes ?? 0) === 0) {
            return { success: false, error: 'Plano não encontrado' }
        }
        return { success: true, data: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao desativar plano' }
    }
}
