-- Migration 004: Broadcast & Remarketing
-- Creates tables for mass messaging and remarketing campaigns

-- Broadcasts (mass messages)
CREATE TABLE IF NOT EXISTS broadcasts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON: {text, media?, buttons?[], parseMode?}
    target_type TEXT NOT NULL CHECK (target_type IN ('channel', 'group', 'users')),
    target_id TEXT, -- channel/group ID or null for 'users'
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
    scheduled_at TEXT,
    sent_at TEXT,
    total_recipients INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    FOREIGN KEY (bot_id) REFERENCES bots (id)
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant ON broadcasts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_bot ON broadcasts (bot_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON broadcasts (status, scheduled_at);

-- Remarketing Campaigns
CREATE TABLE IF NOT EXISTS remarketing_campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    segment TEXT NOT NULL CHECK (segment IN ('all', 'not_purchased', 'purchased', 'pix_recovery', 'expired', 'group_members')),
    bot_id TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON: {text, media?, buttons?[], parseMode?}
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    filters TEXT DEFAULT '{}', -- JSON: {flow_id?, date_range?, custom?}
    total_targeted INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    FOREIGN KEY (bot_id) REFERENCES bots (id)
);

CREATE INDEX IF NOT EXISTS idx_remarketing_tenant ON remarketing_campaigns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_remarketing_status ON remarketing_campaigns (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_remarketing_bot ON remarketing_campaigns (bot_id);
