-- VIP Groups table (Communities/Channels per tenant)
CREATE TABLE IF NOT EXISTS vip_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('telegram', 'discord')),
    provider_id TEXT NOT NULL, -- Chat ID (TG) or Guild/Channel ID (DC)
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('group', 'channel', 'community')),
    invite_link TEXT,
    bot_id TEXT, -- Bot capable of managing this group (optional, can be any bot in tenant)
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    FOREIGN KEY (bot_id) REFERENCES bots (id),
    UNIQUE (tenant_id, provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_vip_groups_tenant ON vip_groups (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vip_groups_provider ON vip_groups (provider, provider_id);
