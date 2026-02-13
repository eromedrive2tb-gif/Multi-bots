/**
 * MOLECULE: process-checkout
 * Orquestra: busca gateway → gera PIX → salva transação → envia ao usuário
 * Composição técnica de atoms, sem lógica de decisão
 */

import type { UniversalContext, Result } from '../../../core/types'
import type { PixResult } from '../../../core/payment-types'
import { generatePix } from '../../atoms/payments/generate-pix'
import { dbSaveTransaction } from '../../atoms/database/db-save-transaction'
import { dbGetGateways } from '../../atoms/database/db-get-gateways'
import { dbGetPlans } from '../../atoms/database/db-get-plans'
import { sendMessage } from '../general/send-message'
import { inlineKeyboard } from '../general/inline-keyboard'

export interface CheckoutParams {
    planId?: string
    gatewayId?: string
    amount?: number // override centavos, se não houver plano
    description?: string
    expirationMinutes?: number
}

export async function processCheckout(
    ctx: UniversalContext,
    params: CheckoutParams
): Promise<Result<PixResult>> {
    const db = ctx.db
    if (!db) {
        return { success: false, error: 'Database não disponível no contexto' }
    }

    try {
        // 1. Buscar gateway ativo (prioriza o default)
        const gateways = await dbGetGateways({ db, tenantId: ctx.tenantId, activeOnly: true })

        let gateway = params.gatewayId
            ? gateways.find(g => g.id === params.gatewayId)
            : gateways.find(g => g.isDefault) || gateways[0]

        if (!gateway) {
            return { success: false, error: 'Nenhum gateway de pagamento configurado' }
        }

        // 2. Buscar plano (se planId fornecido)
        let amount = params.amount || 0
        let description = params.description || 'Pagamento'

        if (params.planId) {
            const plans = await dbGetPlans({ db, tenantId: ctx.tenantId })
            const plan = plans.find(p => p.id === params.planId)
            if (!plan) {
                return { success: false, error: `Plano "${params.planId}" não encontrado` }
            }
            amount = plan.price
            description = plan.name
        }

        if (amount <= 0) {
            return { success: false, error: 'Valor do pagamento deve ser positivo' }
        }

        // 3. Gerar transação local
        const transactionId = crypto.randomUUID()

        // 4. Gerar PIX no gateway
        const pixResult = await generatePix({
            provider: gateway.provider,
            credentials: gateway.credentials,
            amount,
            description,
            externalReference: transactionId,
            expirationMinutes: params.expirationMinutes || 30,
        })

        if (!pixResult.success) {
            return { success: false, error: pixResult.error }
        }

        // 5. Salvar transação no banco
        const expiresAt = pixResult.expiresAt
        await dbSaveTransaction({
            db,
            id: transactionId,
            tenantId: ctx.tenantId,
            customerId: undefined, // será preenchido via CRM
            gatewayId: gateway.id,
            planId: params.planId,
            botId: ctx.botId,
            flowId: ctx.metadata.currentFlowId,
            externalId: pixResult.externalId,
            amount,
            pixCode: pixResult.pixCode,
            pixQrcode: pixResult.pixQrcode || undefined,
            expiresAt,
        })

        // 6. Enviar PIX para o usuário
        const amountFormatted = (amount / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        })

        await sendMessage(ctx, {
            text: `💰 <b>Pagamento PIX</b>\n\n` +
                `📋 ${description}\n` +
                `💵 Valor: <b>${amountFormatted}</b>\n\n` +
                `📱 <b>Código PIX (copia e cola):</b>\n<code>${pixResult.pixCode}</code>\n\n` +
                `⏰ Expira em ${params.expirationMinutes || 30} minutos`,
            parseMode: 'HTML',
        })

        return {
            success: true,
            data: {
                transactionId,
                externalId: pixResult.externalId,
                pixCode: pixResult.pixCode,
                pixQrcode: pixResult.pixQrcode,
                amount,
                expiresAt,
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro no checkout',
        }
    }
}
