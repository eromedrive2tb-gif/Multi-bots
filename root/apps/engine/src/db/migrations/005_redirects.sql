-- Migration 005: Redirects (Smart Links & Cloaking)
-- Creates tables for URL redirection and click tracking

CREATE TABLE IF NOT EXISTS redirects (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
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
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS idx_redirects_tenant ON redirects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_redirects_slug ON redirects (slug);

CREATE TABLE IF NOT EXISTS redirect_clicks (
    id TEXT PRIMARY KEY,
    redirect_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'bot')),
    referer TEXT,
    country TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (redirect_id) REFERENCES redirects (id)
);

CREATE INDEX IF NOT EXISTS idx_clicks_redirect ON redirect_clicks (redirect_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON redirect_clicks (created_at);
