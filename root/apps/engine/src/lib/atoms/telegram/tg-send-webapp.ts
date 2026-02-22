
import { z } from 'zod'
import { Bot, Context, InlineKeyboard } from 'grammy'
import type { UniversalContext, Result } from '../../../core/types'

/**
 * ATOM: Send WebApp
 * Sends a message with a WebApp button
 */

const DEFAULT_DASHBOARD_URL = 'https://multibotcrmdev.vitrine.top'

const paramsSchema = z.object({
    text: z.string(),
    button_text: z.string(),
    page_id: z.string(),
    parse_mode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional(),
    dashboard_url: z.string().url().optional(),
})

export async function tgSendWebApp(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    try {
        const { text, button_text, page_id, parse_mode, dashboard_url } = paramsSchema.parse(params)

        if (ctx.provider !== 'tg') {
            return { success: false, error: 'Provider must be telegram' }
        }

        const bot = new Bot(ctx.botToken)

        // Use injected URL or fallback to default
        const dashboardUrl = dashboard_url ?? DEFAULT_DASHBOARD_URL
        const webAppUrl = `${dashboardUrl}/view/${ctx.tenantId}/${page_id}`

        const keyboard = new InlineKeyboard()
            .webApp(button_text, webAppUrl)

        await bot.api.sendMessage(ctx.chatId, text, {
            reply_markup: keyboard,
            parse_mode: parse_mode as any
        })

        return { success: true, data: { sent: true, url: webAppUrl } }

    } catch (error) {
        console.error('[Atom] Error sending WebApp:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error sending WebApp'
        }
    }
}

