/**
 * ORGANISM: PaymentService
 * Serviço completo de pagamentos — é aqui que o tenantId é usado
 * Captura erros e decide fluxo de erro
 * 
 * Responsabilidades:
 * - CRUD de gateways
 * - CRUD de planos
 * - Listagem de transações
 * - Resumo financeiro
 * - Processamento de webhooks de pagamento
 */

import type { PaymentGateway, Plan, Transaction, FinancialSummary, AddGatewayInput, AddPlanInput } from '../../../core/payment-types'
import type { Result } from '../../../core/types'
import { dbSaveGateway } from '../../atoms/database/db-save-gateway'
import { dbGetGateways } from '../../atoms/database/db-get-gateways'
import { dbDeleteGateway } from '../../atoms/database/db-delete-gateway'
import { dbSavePlan } from '../../atoms/database/db-save-plan'
import { dbGetPlans } from '../../atoms/database/db-get-plans'
import { dbGetTransactions, dbGetFinancialSummary } from '../../atoms/database/db-get-transactions'
import { dbUpdateTransaction } from '../../atoms/database/db-update-transaction'
import { checkPaymentStatus } from '../../atoms/payments/check-payment-status'
import type { TransactionStatus } from '../../../core/payment-types'

export class PaymentService {
    constructor(
        private db: D1Database,
        private tenantId: string
    ) { }

    // ============================================
    // GATEWAYS
    // ============================================

    async listGateways(): Promise<PaymentGateway[]> {
        try {
            return await dbGetGateways({ db: this.db, tenantId: this.tenantId })
        } catch (error) {
            throw new Error(`Erro ao listar gateways: ${error instanceof Error ? error.message : 'desconhecido'}`)
        }
    }

    async addGateway(input: AddGatewayInput): Promise<Result<PaymentGateway>> {
        try {
            const id = crypto.randomUUID()
            const gateway = await dbSaveGateway({
                db: this.db,
                id,
                tenantId: this.tenantId,
                name: input.name,
                provider: input.provider,
                credentials: input.credentials,
                isDefault: input.isDefault,
            })
            return { success: true, data: gateway }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao adicionar gateway' }
        }
    }

    async removeGateway(gatewayId: string): Promise<Result<boolean>> {
        try {
            const deleted = await dbDeleteGateway({
                db: this.db,
                gatewayId,
                tenantId: this.tenantId,
            })
            if (!deleted) {
                return { success: false, error: 'Gateway não encontrado' }
            }
            return { success: true, data: true }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao remover gateway' }
        }
    }

    // ============================================
    // PLANS
    // ============================================

    async listPlans(activeOnly = false): Promise<Plan[]> {
        try {
            return await dbGetPlans({ db: this.db, tenantId: this.tenantId, activeOnly })
        } catch (error) {
            throw new Error(`Erro ao listar planos: ${error instanceof Error ? error.message : 'desconhecido'}`)
        }
    }

    async addPlan(input: AddPlanInput): Promise<Result<Plan>> {
        try {
            const id = crypto.randomUUID()
            const plan = await dbSavePlan({
                db: this.db,
                id,
                tenantId: this.tenantId,
                name: input.name,
                description: input.description,
                price: input.price,
                currency: input.currency,
                type: input.type,
                intervalDays: input.intervalDays,
                metadata: input.metadata,
            })
            return { success: true, data: plan }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao adicionar plano' }
        }
    }

    async deletePlan(planId: string): Promise<Result<boolean>> {
        try {
            const result = await this.db.prepare(
                `UPDATE plans SET is_active = 0, updated_at = ? WHERE id = ? AND tenant_id = ?`
            ).bind(new Date().toISOString(), planId, this.tenantId).run()

            if ((result.meta?.changes ?? 0) === 0) {
                return { success: false, error: 'Plano não encontrado' }
            }
            return { success: true, data: true }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao desativar plano' }
        }
    }

    // ============================================
    // TRANSACTIONS
    // ============================================

    async listTransactions(filters?: {
        status?: TransactionStatus
        gatewayId?: string
        customerId?: string
        botId?: string
        limit?: number
        offset?: number
    }): Promise<Transaction[]> {
        try {
            return await dbGetTransactions({
                db: this.db,
                tenantId: this.tenantId,
                ...filters,
            })
        } catch (error) {
            throw new Error(`Erro ao listar transações: ${error instanceof Error ? error.message : 'desconhecido'}`)
        }
    }

    async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
        try {
            return await dbGetFinancialSummary({
                db: this.db,
                tenantId: this.tenantId,
                startDate,
                endDate,
            })
        } catch (error) {
            throw new Error(`Erro ao calcular resumo: ${error instanceof Error ? error.message : 'desconhecido'}`)
        }
    }

    async refreshTransactionStatus(transactionId: string): Promise<Result<{ status: TransactionStatus }>> {
        try {
            // 1. Buscar transação
            const txs = await dbGetTransactions({
                db: this.db,
                tenantId: this.tenantId,
                limit: 1,
            })
            const tx = txs.find(t => t.id === transactionId)
            if (!tx) return { success: false, error: 'Transação não encontrada' }
            if (!tx.externalId) return { success: false, error: 'Transação sem ID externo' }

            // 2. Buscar gateway
            const gateways = await dbGetGateways({ db: this.db, tenantId: this.tenantId })
            const gateway = gateways.find(g => g.id === tx.gatewayId)
            if (!gateway) return { success: false, error: 'Gateway não encontrado' }

            // 3. Consultar status no gateway
            const statusResult = await checkPaymentStatus({
                provider: gateway.provider,
                credentials: gateway.credentials,
                externalId: tx.externalId,
            })

            if (!statusResult.success) {
                return { success: false, error: statusResult.error }
            }

            // 4. Atualizar no banco
            await dbUpdateTransaction({
                db: this.db,
                transactionId,
                tenantId: this.tenantId,
                status: statusResult.status,
                paidAt: statusResult.paidAt || undefined,
            })

            return { success: true, data: { status: statusResult.status } }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar status' }
        }
    }
}
