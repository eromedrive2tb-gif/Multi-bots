import type { UniversalContext, Result } from '../../../core/types'
import { tgSendButtons } from '../../atoms'
import { dcSendButtons } from '../../atoms'
import { htmlToMarkdown } from '../../shared'

export async function inlineKeyboard(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const text = String(params.text || '')
    const buttons = params.buttons as Array<{ text: string; callback: string }>
    const parseMode = (params.parse_mode as 'HTML' | 'Markdown' | 'MarkdownV2') || 'HTML'

    if (!Array.isArray(buttons)) {
        return { success: false, error: 'Buttons must be an array' }
    }

    // Convert flat list to rows (default 1 per row for simplicity)
    const rows = buttons.map(btn => [{ text: btn.text, callback_data: btn.callback }])

    try {
        switch (ctx.provider) {
            case 'tg': {
                const result = await tgSendButtons({
                    token: ctx.botToken,
                    chatId: ctx.chatId,
                    text: text,
                    buttons: rows,
                    parseMode: parseMode
                })

                if (result.success) {
                    return { success: true, data: { messageId: result.messageId } }
                }
                return { success: false, error: result.error ?? 'Unknown Telegram error' }
            }
            case 'dc': {
                const content = (parseMode === 'HTML' || !parseMode) ? htmlToMarkdown(text) : text

                const result = await dcSendButtons({
                    token: ctx.botToken,
                    channelId: ctx.chatId,
                    text: content,
                    buttons: rows.map(row => row.map(btn => ({
                        text: btn.text,
                        custom_id: btn.callback_data, // Ensure callback_data is used as custom_id
                        style: 1 // Default to Primary (blue)
                    }))),
                })

                if (result.success) {
                    return { success: true, data: { messageId: result.messageId } }
                }
                return { success: false, error: result.error ?? 'Unknown Discord error' }
            }
            default:
                return { success: false, error: `Provider ${ctx.provider} not supported for inline_keyboard` }
        }
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
}
