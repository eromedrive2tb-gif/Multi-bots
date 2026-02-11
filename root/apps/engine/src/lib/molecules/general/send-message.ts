import type { UniversalContext, Result } from '../../../core/types'
import { tgSendText } from '../../atoms'
import { dcSendMessage } from '../../atoms'
import { htmlToMarkdown } from '../../shared'

/**
 * send_message - Universal message sending action
 * Dispatches to provider-specific atom based on ctx.provider
 */
export async function sendMessage(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const text = String(params.text ?? '')
    const parseMode = params.parseMode as 'HTML' | 'Markdown' | 'MarkdownV2' | undefined

    try {
        switch (ctx.provider) {
            case 'tg': {
                const result = await tgSendText({
                    token: ctx.botToken,
                    chatId: ctx.chatId,
                    text,
                    parseMode: parseMode ?? 'HTML',
                })
                if (result.success) {
                    return { success: true, data: { messageId: result.messageId } }
                }
                return { success: false, error: result.error ?? 'Failed to send message' }
            }

            case 'dc': {
                // Determine if we should convert HTML to Markdown based on parseMode or default behavior
                // The engine defaults to HTML, so we should convert
                const content = (parseMode === 'HTML' || !parseMode) ? htmlToMarkdown(text) : text

                const result = await dcSendMessage({
                    token: ctx.botToken,
                    channelId: ctx.chatId,
                    content,
                    embed: params.embed as { title?: string; description?: string; color?: number } | undefined,
                })
                if (result.success) {
                    return { success: true, data: { messageId: result.messageId } }
                }
                return { success: false, error: result.error ?? 'Failed to send message' }
            }

            case 'wa': {
                // WhatsApp implementation placeholder
                return { success: false, error: 'WhatsApp provider not yet implemented' }
            }

            default:
                return { success: false, error: `Unknown provider: ${ctx.provider}` }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error in send_message',
        }
    }
}
