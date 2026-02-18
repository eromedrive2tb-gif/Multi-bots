
import { DurableObject } from 'cloudflare:workers';
import { RemarketingJob, RemarketingJobSchema } from '../../domain/types';
import { MessageSenderRegistry } from '../../application/MessageSenderRegistry';
import { TelegramSender } from '../adapters/TelegramSender';
import { DiscordSender } from '../adapters/DiscordSender';
import { D1RemarketingLogRepository } from '../repositories/D1RemarketingLogRepository';
import { CampaignExecutor } from '../adapters/CampaignExecutor';

export interface Env {
    DB: D1Database;
}

export class SchedulerDO extends DurableObject<Env> {
    private registry: MessageSenderRegistry;
    private logRepository: D1RemarketingLogRepository;
    private sessions: Set<WebSocket> = new Set();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.registry = new MessageSenderRegistry();
        this.registry.register(new TelegramSender());
        this.registry.register(new DiscordSender());
        this.registry.register(new CampaignExecutor(env.DB, (data: any) => this.broadcast(data))); // Register CampaignExecutor with broadcast callback
        this.logRepository = new D1RemarketingLogRepository(env.DB);

        // Recover sessions on restart
        this.ctx.getWebSockets().forEach(ws => this.sessions.add(ws));
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        try {
            if (request.method === 'POST' && url.pathname === '/schedule') {
                console.log('[SchedulerDO] Received schedule request');
                const body = await request.json();

                let job: RemarketingJob;
                try {
                    const parseResult = RemarketingJobSchema.safeParse(body);
                    if (parseResult.success) {
                        job = parseResult.data;
                    } else {
                        console.warn('[SchedulerDO] Zod validation failed, using raw body. Errors:', parseResult.error.format());
                        job = body as RemarketingJob;
                    }
                } catch (e) {
                    console.warn('[SchedulerDO] Zod crashed during validation (bundling issue). Using raw body.', e);
                    job = body as RemarketingJob;
                }

                try {
                    await this.ctx.storage.put(`job:${job.id}`, job);
                    console.log(`[SchedulerDO] Saved job ${job.id} to storage.`);
                } catch (storeError) {
                    console.error(`[SchedulerDO] Failed to save job:`, storeError);
                    throw storeError;
                }

                // Check if we need to update the alarm
                const currentAlarm = await this.ctx.storage.getAlarm();
                console.log(`[SchedulerDO] Current alarm: ${currentAlarm}, New Job Schedule: ${job.scheduledFor}`);

                if (currentAlarm === null || job.scheduledFor < currentAlarm) {
                    console.log(`[SchedulerDO] Setting alarm for ${job.scheduledFor} (${new Date(job.scheduledFor).toISOString()})`);
                    await this.ctx.storage.setAlarm(job.scheduledFor);
                    console.log(`[SchedulerDO] Alarm set successfully.`);
                } else {
                    console.log(`[SchedulerDO] Alarm not updated (existing alarm is sooner).`);
                }

                return new Response(JSON.stringify({ scheduled: true, jobId: job.id }), { status: 200 });
            }

            if (request.method === 'POST' && url.pathname === '/cancel') {
                const { jobId } = await request.json() as { jobId: string };
                await this.ctx.storage.delete(`job:${jobId}`);
                // We don't necessarily need to clear the alarm immediately, 
                // the alarm handler can handle the case where the job is missing.
                return new Response(JSON.stringify({ cancelled: true }), { status: 200 });
            }

            if (url.pathname === '/ws') {
                if (request.headers.get('Upgrade') !== 'websocket') {
                    return new Response('Expected Upgrade: websocket', { status: 426 });
                }

                const pair = new WebSocketPair();
                const [client, server] = Object.values(pair);

                this.ctx.acceptWebSocket(server);
                this.sessions.add(server);

                return new Response(null, { status: 101, webSocket: client });
            }

            return new Response('Not Found', { status: 404 });
        } catch (error: any) {
            console.error('[SchedulerDO] Error processing request:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        // Handle messages from client if needed (e.g., ping/pong or subscriptions)
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
        this.sessions.delete(ws);
    }

    async webSocketError(ws: WebSocket, error: any) {
        this.sessions.delete(ws);
    }

    private broadcast(data: any) {
        const payload = JSON.stringify(data);
        this.sessions.forEach(ws => {
            try {
                ws.send(payload);
            } catch (e) {
                this.sessions.delete(ws);
            }
        });
    }

    async alarm(): Promise<void> {
        console.log('[SchedulerDO] 🚨 ALARM HANDLER TRIGGERED 🚨');
        try {
            const jobsMap = await this.ctx.storage.list<RemarketingJob>({ prefix: 'job:' });
            const now = Date.now();
            const jobs = Array.from(jobsMap.values());

            // Filter jobs that are due
            const dueJobs = jobs.filter(job => job.scheduledFor <= now);

            let nextAlarmTime: number | null = null;

            // Determine the next alarm time from remaining jobs
            const futureJobs = jobs.filter(job => job.scheduledFor > now);
            if (futureJobs.length > 0) {
                nextAlarmTime = Math.min(...futureJobs.map(j => j.scheduledFor));
            }

            if (nextAlarmTime) {
                await this.ctx.storage.setAlarm(nextAlarmTime);
            }

            // Process due jobs
            for (const job of dueJobs) {
                try {
                    const sender = this.registry.getSender(job.channel);
                    await sender.send(job);

                    try {
                        await this.logRepository.save({
                            id: crypto.randomUUID(),
                            jobId: job.id,
                            tenantId: job.tenantId,
                            channel: job.channel,
                            status: 'success',
                            executedAt: Date.now(),
                            requestPayload: job.payload,
                        });
                    } catch (logError) {
                        console.error('[SchedulerDO] Failed to save success log:', logError);
                    }

                    // Handle Recurrence
                    if (job.recurrence) {
                        const nextTime = this.calculateNextRun(job.recurrence, job.scheduledFor);
                        if (nextTime) {
                            const nextJob = { ...job, scheduledFor: nextTime, attempts: 0, status: 'pending' };
                            await this.ctx.storage.put(`job:${job.id}`, nextJob);
                            // Verify alarm
                            const currentAlarm = await this.ctx.storage.getAlarm();
                            if (currentAlarm === null || nextTime < currentAlarm) {
                                await this.ctx.storage.setAlarm(nextTime);
                            }
                            continue; // Skip deletion
                        }
                    }

                } catch (error: any) {

                    if (error.name === 'RateLimitError' || (error.retryAfter && typeof error.retryAfter === 'number')) {
                        const retryAfter = error.retryAfter || 5000;
                        //console.log(`[Scheduler] Rate limit hit for job ${job.id}. Rescheduling in ${retryAfter}ms`);

                        const nextTime = Date.now() + retryAfter;
                        const nextJob = { ...job, scheduledFor: nextTime, status: 'pending' };
                        await this.ctx.storage.put(`job:${job.id}`, nextJob);

                        const currentAlarm = await this.ctx.storage.getAlarm();
                        if (currentAlarm === null || nextTime < currentAlarm) {
                            await this.ctx.storage.setAlarm(nextTime);
                        }
                        continue; // Skip deletion and failure logging
                    }

                    if (error.name === 'BlockError' || error.name === 'InvalidRequestError') {
                        console.warn(`[SchedulerDO] Job ${job.id} failed (Expected): ${error.message}`);
                    } else {
                        console.error(`[SchedulerDO] Unexpected failure for job ${job.id}:`, error);
                    }

                    try {
                        await this.logRepository.save({
                            id: crypto.randomUUID(),
                            jobId: job.id,
                            tenantId: job.tenantId,
                            channel: job.channel,
                            status: 'failure',
                            executedAt: Date.now(),
                            error: error.message,
                            requestPayload: job.payload,
                        });
                    } catch (logError) {
                        console.error('[SchedulerDO] Failed to save failure log:', logError);
                    }

                    // Retry logic could be implemented here (e.g., reschedule if attempts < maxAttempts)
                }

                // Remove the job from storage if not recurring or if next run calculation failed
                await this.ctx.storage.delete(`job:${job.id}`);
            }
        } catch (error) {
            console.error('[SchedulerDO] Alarm handler failed:', error);
        }
    }

    private calculateNextRun(recurrence: RemarketingJob['recurrence'], lastScheduled: number): number | null {
        if (!recurrence) return null;

        const now = Date.now();
        const baseTime = Math.max(now, lastScheduled);
        const date = new Date(baseTime);

        // Parse time HH:mm
        let [hours, minutes] = [0, 0];
        if (recurrence.time) {
            const parts = recurrence.time.split(':');
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
        }

        switch (recurrence.type) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                if (recurrence.time) {
                    date.setHours(hours, minutes, 0, 0);
                }
                return date.getTime();
            case 'weekly':
                date.setDate(date.getDate() + 7);
                if (recurrence.time) {
                    date.setHours(hours, minutes, 0, 0);
                }
                return date.getTime();
            // Add other types as needed
            default:
                return null;
        }
    }
}
