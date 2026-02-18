-- Migration: Create remarketing_logs table
CREATE TABLE IF NOT EXISTS remarketing_logs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,          -- 'success' or 'failure'
    executed_at INTEGER NOT NULL,  -- Timestamp in ms
    error TEXT,
    request_payload TEXT,          -- JSON string
    response_payload TEXT          -- JSON string
);

CREATE INDEX IF NOT EXISTS idx_remarketing_logs_tenant_id ON remarketing_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_remarketing_logs_job_id ON remarketing_logs(job_id);
