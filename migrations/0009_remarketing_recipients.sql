CREATE TABLE remarketing_recipients (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, blocked
    error_code INTEGER,
    attempt_count INTEGER DEFAULT 0,
    updated_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (campaign_id) REFERENCES remarketing_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_remarketing_recipients_campaign_status ON remarketing_recipients(campaign_id, status);
