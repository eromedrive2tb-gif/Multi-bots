
import { D1Database } from '@cloudflare/workers-types';
import { IRemarketingLogRepository, RemarketingLog } from '../../domain/types';

export class D1RemarketingLogRepository implements IRemarketingLogRepository {
    constructor(private readonly db: D1Database) { }

    async save(log: RemarketingLog): Promise<void> {
        const query = `
      INSERT INTO remarketing_logs (id, job_id, tenant_id, channel, status, executed_at, error, request_payload, response_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        await this.db.prepare(query)
            .bind(
                log.id,
                log.jobId,
                log.tenantId,
                log.channel,
                log.status,
                log.executedAt,
                log.error || null,
                JSON.stringify(log.requestPayload),
                log.responsePayload ? JSON.stringify(log.responsePayload) : null
            )
            .run();
    }

    async getByJobId(jobId: string): Promise<RemarketingLog | null> {
        const query = `SELECT * FROM remarketing_logs WHERE job_id = ?`;
        const result = await this.db.prepare(query).bind(jobId).first<any>();

        if (!result) return null;

        return this.mapToDomain(result);
    }

    async getRecentLogs(tenantId: string, limit: number = 50): Promise<RemarketingLog[]> {
        const query = `
      SELECT * FROM remarketing_logs 
      WHERE tenant_id = ? 
      ORDER BY executed_at DESC 
      LIMIT ?
    `;
        const { results } = await this.db.prepare(query).bind(tenantId, limit).all<any>();

        return results.map(this.mapToDomain);
    }

    private mapToDomain(row: any): RemarketingLog {
        return {
            id: row.id,
            jobId: row.job_id,
            tenantId: row.tenant_id,
            channel: row.channel,
            status: row.status as 'success' | 'failure',
            executedAt: row.executed_at,
            error: row.error,
            requestPayload: JSON.parse(row.request_payload),
            responsePayload: row.response_payload ? JSON.parse(row.response_payload) : undefined,
        };
    }
}
