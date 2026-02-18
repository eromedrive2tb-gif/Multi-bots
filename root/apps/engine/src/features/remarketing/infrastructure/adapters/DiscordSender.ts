
import { IMessageSender, RemarketingJob } from '../../domain/types';

export class DiscordSender implements IMessageSender {
    readonly channel = 'discord';

    async send(job: RemarketingJob): Promise<void> {
        const { payload } = job;
        const { channelId, content, botToken } = payload;

        if (!botToken || !channelId || !content) {
            throw new Error('Missing required payload fields: botToken, channelId, or content');
        }

        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Discord API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
    }
}
