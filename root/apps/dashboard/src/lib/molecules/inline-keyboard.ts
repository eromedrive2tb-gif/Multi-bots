import type { UniversalContext, Result } from '../../core/types'
import { tgSendButtons } from '../atoms/telegram/tg-send-buttons'

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

    // Convert flat list to rows (default 1 per row or 2? Let's do 1 per row for now or check params)
    // For simplicity, we stack them 1 per row unless 'layout' param exists?
    // Let's assume 1 per row for now matching the example json logic structure implies 
    // actually the example json has a flat list. 
    // We can map 1 button per row.

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
            // Other providers...
            default:
                return { success: false, error: `Provider ${ctx.provider} not supported for inline_keyboard` }
        }
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
}
