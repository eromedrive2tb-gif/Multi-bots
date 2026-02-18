import { z } from 'zod';

// --- Value Objects & Types ---

export const RemarketingJobSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string(),
    scheduledFor: z.number(), // Timestamp in ms
    channel: z.enum(['telegram', 'discord', 'whatsapp', 'campaign']),
    payload: z.record(z.any()), // Specific payload for the channel (e.g., recipientId, message text/template)
    status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
    attempts: z.number().default(0),
    maxAttempts: z.number().default(3),
    recurrence: z.object({
        type: z.enum(['daily', 'weekly', 'monthly', 'once']),
        time: z.string().optional(), // HH:mm
        days: z.array(z.number()).optional(), // 0-6
    }).optional(),
    campaignId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export type RemarketingJob = z.infer<typeof RemarketingJobSchema>;

export interface RemarketingLog {
    id: string;
    jobId: string;
    tenantId: string;
    channel: string;
    status: 'success' | 'failure';
    executedAt: number;
    error?: string;
    requestPayload: any;
    responsePayload?: any;
}

// --- Interfaces (Ports) ---

// --- Domain Errors ---

export class RateLimitError extends Error {
    retryAfter: number;
    constructor(retryAfter: number) {
        super(`Rate limited. Retry after ${retryAfter}ms`);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

export class BlockError extends Error {
    constructor(message: string = 'User blocked the bot') {
        super(message);
        this.name = 'BlockError';
    }
}

export class InvalidRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidRequestError';
    }
}

export interface IScheduler {
    schedule(job: RemarketingJob): Promise<string>; // Returns job/alarm ID
    cancel(jobId: string): Promise<void>;
}

export interface IMessageSender {
    readonly channel: RemarketingJob['channel'];
    send(job: RemarketingJob): Promise<void>;
}

export interface IRemarketingLogRepository {
    save(log: RemarketingLog): Promise<void>;
    getByJobId(jobId: string): Promise<RemarketingLog | null>;
    getRecentLogs(tenantId: string, limit?: number): Promise<RemarketingLog[]>;
}
