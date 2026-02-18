
import { IMessageSender, RemarketingJob } from '../../domain/types';

export class MessageSenderRegistry {
    private senders: Map<string, IMessageSender> = new Map();

    constructor() { }

    register(sender: IMessageSender): void {
        if (this.senders.has(sender.channel)) {
            console.warn(`Sender for channel ${sender.channel} is already registered. Overwriting.`);
        }
        this.senders.set(sender.channel, sender);
    }

    getSender(channel: string): IMessageSender {
        const sender = this.senders.get(channel);
        if (!sender) {
            throw new Error(`No sender registered for channel: ${channel}`);
        }
        return sender;
    }
}
