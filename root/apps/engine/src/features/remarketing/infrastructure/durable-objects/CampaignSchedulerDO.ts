
import { DurableObject } from 'cloudflare:workers';
import { RemarketingJob } from '../../domain/types';
import { MessageSenderRegistry } from '../../application/MessageSenderRegistry';
import { TelegramSender } from '../adapters/TelegramSender';
import { DiscordSender } from '../adapters/DiscordSender';
import { D1RemarketingLogRepository } from '../repositories/D1RemarketingLogRepository';
import { CampaignExecutor } from '../adapters/CampaignExecutor';
import { Env } from '../../../../core/types';

export class CampaignSchedulerDO extends DurableObject<Env> {
    private registry: MessageSenderRegistry;
    private logRepository: D1RemarketingLogRepository;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.registry = new MessageSenderRegistry();
        this.registry.register(new TelegramSender());
        this.registry.register(new DiscordSender());
        // Simple callback, notifications and broadcasts are handled at the Session level
        this.registry.register(new CampaignExecutor(env.DB, () => { }));
        this.logRepository = new D1RemarketingLogRepository(env.DB);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        try {
            if (request.method === 'POST' && url.pathname === '/schedule') {
                const job = await request.json() as RemarketingJob;
                await this.ctx.storage.put(`job:${job.id}`, job);

                const currentAlarm = await this.ctx.storage.getAlarm();
                if (currentAlarm === null || job.scheduledFor < currentAlarm) {
                    await this.ctx.storage.setAlarm(job.scheduledFor);
                }
                return new Response(JSON.stringify({ scheduled: true, jobId: job.id }), { status: 200 });
            }

            if (request.method === 'POST' && url.pathname === '/cancel') {
                const { jobId } = await request.json() as { jobId: string };
                await this.ctx.storage.delete(`job:${jobId}`);
                return new Response(JSON.stringify({ cancelled: true }), { status: 200 });
            }

            return new Response('Not Found', { status: 404 });
        } catch (error: any) {
            console.error('[CampaignSchedulerDO] Error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    async alarm(): Promise<void> {
        console.log('[CampaignSchedulerDO] 🚨 ALARM HANDLER TRIGGERED 🚨');
        try {
            const jobsMap = await this.ctx.storage.list<RemarketingJob>({ prefix: 'job:' });
            const now = Date.now();
            const jobs = Array.from(jobsMap.values());

            const dueJobs = jobs.filter(job => job.scheduledFor <= now);
            let nextAlarmTime: number | null = null;
            const futureJobs = jobs.filter(job => job.scheduledFor > now);

            if (futureJobs.length > 0) {
                nextAlarmTime = Math.min(...futureJobs.map(j => j.scheduledFor));
            }

            if (nextAlarmTime) {
                await this.ctx.storage.setAlarm(nextAlarmTime);
            }

            for (const job of dueJobs) {
                try {
                    const sender = this.registry.getSender(job.channel);
                    await sender.send(job);

                    await this.logRepository.save({
                        id: crypto.randomUUID(),
                        jobId: job.id,
                        tenantId: job.tenantId,
                        channel: job.channel,
                        status: 'success',
                        executedAt: Date.now(),
                        requestPayload: job.payload,
                    });

                    if (job.recurrence) {
                        const nextTime = this.calculateNextRun(job.recurrence, job.scheduledFor);
                        if (nextTime) {
                            const nextJob = { ...job, scheduledFor: nextTime, attempts: 0, status: 'pending' };
                            await this.ctx.storage.put(`job:${job.id}`, nextJob);
                            const currentAlarm = await this.ctx.storage.getAlarm();
                            if (currentAlarm === null || nextTime < currentAlarm) {
                                await this.ctx.storage.setAlarm(nextTime);
                            }
                            continue;
                        }
                    }

                } catch (error: any) {
                    if (error.name === 'RateLimitError' || error.retryAfter) {
                        const nextTime = Date.now() + (error.retryAfter || 5000);
                        const nextJob = { ...job, scheduledFor: nextTime, status: 'pending' };
                        await this.ctx.storage.put(`job:${job.id}`, nextJob);
                        const currentAlarm = await this.ctx.storage.getAlarm();
                        if (currentAlarm === null || nextTime < currentAlarm) {
                            await this.ctx.storage.setAlarm(nextTime);
                        }
                        continue;
                    }

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
                }
                await this.ctx.storage.delete(`job:${job.id}`);
            }
        } catch (error) {
            console.error('[CampaignSchedulerDO] Alarm handler failed:', error);
        }
    }

    private calculateNextRun(recurrence: RemarketingJob['recurrence'], lastScheduled: number): number | null {
        if (!recurrence) return null;

        const now = Date.now();
        const baseTime = Math.max(now, lastScheduled);
        const date = new Date(baseTime);

        let [hours, minutes] = [0, 0];
        if (recurrence.time) {
            const parts = recurrence.time.split(':');
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
        }

        switch (recurrence.type) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                if (recurrence.time) date.setHours(hours, minutes, 0, 0);
                return date.getTime();
            case 'weekly':
                date.setDate(date.getDate() + 7);
                if (recurrence.time) date.setHours(hours, minutes, 0, 0);
                return date.getTime();
            default:
                return null;
        }
    }
}
