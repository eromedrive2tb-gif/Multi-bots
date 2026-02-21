-- Idempotency table for webhook deduplication
-- Uses D1 (SQLite) INSERT OR IGNORE for strict idempotency
-- (KV eventual consistency can miss duplicates within ~60s window)

CREATE TABLE IF NOT EXISTS processed_webhooks (
    idempotency_key TEXT PRIMARY KEY,
    provider TEXT NOT NULL,          -- 'telegram' | 'discord'
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    processed_at INTEGER NOT NULL,   -- Unix timestamp (ms)
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for TTL cleanup (purge entries older than 24h)
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_ttl
ON processed_webhooks (processed_at);
