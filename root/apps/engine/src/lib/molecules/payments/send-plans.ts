/**
 * MOLECULE: send-plans
 * Blueprint action: Envia lista de planos como botões
 * Busca planos do DB e renderiza como inline_keyboard
 */

import type { UniversalContext, Result } from '../../../core/types'
import { dbGetPlans } from '../../atoms/database/db-get-plans'
import { sendMessage } from '../general/send-message'
import { inlineKeyboard } from '../general/inline-keyboard'

export async function sendPlans(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const db = ctx.db
    if (!db) {
        return { success: false, error: 'Database não disponível no contexto' }
    }

    try {
        // Buscar planos ativos
        const plans = await dbGetPlans({ db, tenantId: ctx.tenantId, activeOnly: true })

        if (plans.length === 0) {
            await sendMessage(ctx, { text: 'Nenhum plano disponível no momento.', parseMode: 'HTML' })
            return { success: true, data: { plansCount: 0 } }
        }

        // Mensagem de apresentação
        const headerText = String(params.text || params.message || '📋 <b>Nossos Planos</b>\n\nEscolha o plano ideal para você:')

        // Montar botões a partir dos planos
        const buttons = plans.map(plan => {
            const priceFormatted = (plan.price / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: plan.currency || 'BRL',
            })
            const label = `${plan.name} - ${priceFormatted}`
            return {
                text: label,
                callback_data: `plan_select:${plan.id}`,
            }
        })

        // Enviar com inline_keyboard
        return await inlineKeyboard(ctx, {
            text: headerText,
            buttons: buttons.map(b => [b]), // uma coluna por plano
            parseMode: 'HTML',
        })
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao enviar planos',
        }
    }
}
