import { IMessageSender, RemarketingJob, RateLimitError, BlockError, InvalidRequestError } from '../../domain/types';

export class TelegramSender implements IMessageSender {
    readonly channel = 'telegram';

    async send(job: RemarketingJob): Promise<void> {
        const { payload } = job;
        const { chatId, message, botToken } = payload;

        if (!botToken || !chatId || !message) {
            throw new InvalidRequestError('Missing required payload fields: botToken, chatId, or message');
        }

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson: any = {};
            try { errorJson = JSON.parse(errorText); } catch (e) { }

            const errorCode = errorJson.error_code || response.status;
            const description = errorJson.description || response.statusText;

            if (errorCode === 429) {
                const retryAfter = (errorJson.parameters?.retry_after || 5) * 1000;
                throw new RateLimitError(retryAfter);
            }

            if (errorCode === 403) {
                throw new BlockError(description);
            }

            if (errorCode === 400) {
                throw new InvalidRequestError(description);
            }

            throw new Error(`Telegram API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
    }
}
