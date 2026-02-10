import { Bot, InlineKeyboard } from 'grammy'

export interface TgSendButtonsProps {
    token: string
    chatId: string | number
    text: string
    buttons: Array<Array<{ text: string; callback_data: string }>>
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
}

export interface TgSendButtonsResult {
    success: boolean
    messageId?: number
    error?: string
}

export async function tgSendButtons({
    token,
    chatId,
    text,
    buttons,
    parseMode = 'HTML',
}: TgSendButtonsProps): Promise<TgSendButtonsResult> {
    try {
        const bot = new Bot(token)

        const keyboard = new InlineKeyboard()

        buttons.forEach(row => {
            row.forEach(btn => {
                keyboard.text(btn.text, btn.callback_data)
            })
            keyboard.row()
        })

        const result = await bot.api.sendMessage(chatId, text, {
            parse_mode: parseMode,
            reply_markup: keyboard,
        })

        return {
            success: true,
            messageId: result.message_id,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao enviar botões',
        }
    }
}
