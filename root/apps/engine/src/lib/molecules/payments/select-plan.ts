/**
 * MOLECULE: select-plan
 * Blueprint action: Busca planos do DB e lida com a seleção dinamicamente.
 * Injeta o objeto 'selected_plan' e variáveis auxiliares na sessão.
 */

import type { UniversalContext, Result } from '../../../core/types'
import { dbGetPlans } from '../../atoms/database/db-get-plans'
import { sendMessage } from '../general/send-message'
import { inlineKeyboard } from '../general/inline-keyboard'

export async function selectPlan(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const db = ctx.db
    if (!db) {
        return { success: false, error: 'Database não disponível no contexto' }
    }

    const isResuming = params._is_resuming === true
    const lastInput = ctx.metadata.lastInput

    // 1. Se estiver retomando e tiver um input (callback), processa a seleção
    if (isResuming && lastInput) {
        // Formato esperado do callback: plan_select:ID
        if (lastInput.startsWith('plan_select:')) {
            const planId = lastInput.split(':')[1]
            const plans = await dbGetPlans({ db, tenantId: ctx.tenantId, activeOnly: true })
            const plan = plans.find(p => p.id === planId)

            if (plan) {
                // Sucesso: Retorna os dados do plano para serem injetados na sessão pela Engine
                return {
                    success: true,
                    data: {
                        selected_plan: plan,
                        plan_name: plan.name,
                        plan_price: (plan.price / 100).toFixed(2).replace('.', ','),
                        plan_id: plan.id,
                        plan_currency: plan.currency || 'BRL'
                    }
                }
            }

            // Se o plano não foi encontrado (ex: deletado enquanto o usuário via a lista), 
            // continuamos para reenviar a lista atualizada abaixo.
        }
    }

    // 2. Se for a primeira vez ou seleção inválida, envia a lista de planos
    try {
        const plans = await dbGetPlans({ db, tenantId: ctx.tenantId, activeOnly: true })

        if (plans.length === 0) {
            await sendMessage(ctx, {
                text: '❌ Nenhum plano disponível no momento. Por favor, tente novamente mais tarde.',
                parseMode: 'HTML'
            })
            return { success: true, data: { plansCount: 0 } }
        }

        const headerText = String(params.text || params.message || '📋 <b>Nossos Planos</b>\n\nEscolha o plano ideal para você:')

        const buttons = plans.map(plan => {
            const priceFormatted = (plan.price / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: plan.currency || 'BRL',
            })
            return {
                text: `${plan.name} - ${priceFormatted}`,
                callback: `plan_select:${plan.id}`,
            }
        })

        // Envia o teclado inline
        const sendResult = await inlineKeyboard(ctx, {
            text: headerText,
            buttons: buttons,
            parseMode: 'HTML',
        })

        if (!sendResult.success) {
            return sendResult
        }

        // Suspende a execução do fluxo aguardando a interação do usuário (callback)
        return {
            success: true,
            data: { suspended: true }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao processar seleção de planos',
        }
    }
}
