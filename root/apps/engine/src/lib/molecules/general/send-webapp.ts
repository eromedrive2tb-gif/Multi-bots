
import type { UniversalContext, Result } from '../../../core/types'
import { tgSendWebApp } from '../../atoms/telegram/tg-send-webapp'
import { dcSendLinkButton } from '../../atoms/discord/dc-send-link-button'
import { htmlToMarkdown } from '../../shared'

/**
 * send_webapp - Universal WebApp action
 * On Telegram: Sends a WebApp button
 * On Discord/Others: Sends a URL button (fallback)
 */
export async function sendWebApp(
    ctx: UniversalContext,
    params: Record<string, unknown>
): Promise<Result<unknown>> {
    const text = String(params.text ?? 'Abra o WebApp:')
    const buttonText = String(params.button_text ?? 'Abrir')
    const pageId = String(params.page_id ?? '')
    const parseMode = params.parse_mode as string | undefined

    // Determine Dashboard URL (Internal policy)
    // In production, this would be an environment variable
    const dashboardUrl = 'https://multibotcrmdev.vitrine.top'
    const fullUrl = `${dashboardUrl}/view/${ctx.tenantId}/${pageId}`

    try {
        switch (ctx.provider) {
            case 'tg': {
                // Use the Telegram atom
                return await tgSendWebApp(ctx, {
                    text,
                    button_text: buttonText,
                    page_id: pageId,
                    parse_mode: parseMode
                })
            }

            case 'dc': {
                // Discord fallback: Link Button
                // Convert HTML to Markdown if needed (Discord doesn't support HTML tags)
                const content = (parseMode === 'HTML' || !parseMode) ? htmlToMarkdown(text) : text

                const result = await dcSendLinkButton({
                    token: ctx.botToken,
                    channelId: ctx.chatId,
                    text: content,
                    buttonText: buttonText,
                    url: fullUrl
                })

                if (result.success) {
                    return { success: true, data: { messageId: result.messageId } }
                }
                return { success: false, error: result.error ?? 'Failed to send Discord link' }
            }

            default:
                return { success: false, error: `Provider ${ctx.provider} does not support send_webapp` }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error in send_webapp',
        }
    }
}
