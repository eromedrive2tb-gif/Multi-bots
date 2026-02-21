-- Fix missing tables for Redirects and Broadcasts features

-- Redirects table
CREATE TABLE IF NOT EXISTS redirects (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    domain TEXT DEFAULT 'multibots.app',
    cloaker_enabled INTEGER DEFAULT 0,
    cloaker_safe_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    total_clicks INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_redirects_tenant ON redirects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_redirects_slug ON redirects (slug);

-- Redirect Clicks table
CREATE TABLE IF NOT EXISTS redirect_clicks (
    id TEXT PRIMARY KEY,
    redirect_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,
    referer TEXT,
    country TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (redirect_id) REFERENCES redirects (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_redirect_clicks_redirect ON redirect_clicks (redirect_id);

-- Broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON
    target_type TEXT NOT NULL,
    target_id TEXT,
    status TEXT DEFAULT 'draft',
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

-- Remarketing Campaigns table
CREATE TABLE IF NOT EXISTS remarketing_campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    segment TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON
    status TEXT DEFAULT 'draft',
    filters TEXT DEFAULT '{}', -- JSON
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
