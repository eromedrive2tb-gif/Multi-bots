-- Multi-tenant Dashboard Schema
-- D1 SQLite Database
-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users table (each user belongs to a tenant)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    UNIQUE (tenant_id, email)
);

-- Sessions table for Auth.js
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions (tenant_id);

-- Bots table (Telegram/Discord bots per tenant)
CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('telegram', 'discord')),
    credentials TEXT NOT NULL, -- JSON: {token, appId?, publicKey?}
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
    status_message TEXT,
    last_check TEXT,
    webhook_secret TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS idx_bots_tenant ON bots (tenant_id);

CREATE INDEX IF NOT EXISTS idx_bots_provider ON bots (provider);

CREATE INDEX IF NOT EXISTS idx_bots_status ON bots (status);

-- Blueprints table (JSON flow definitions per tenant)
CREATE TABLE IF NOT EXISTS blueprints (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    trigger TEXT NOT NULL,
    json_data TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    UNIQUE (tenant_id, trigger)
);

CREATE INDEX IF NOT EXISTS idx_blueprints_tenant ON blueprints (tenant_id);

CREATE INDEX IF NOT EXISTS idx_blueprints_trigger ON blueprints (tenant_id, trigger);

CREATE INDEX IF NOT EXISTS idx_blueprints_active ON blueprints (tenant_id, is_active);

-- Bot Blueprints activation table (Many-to-Many)
CREATE TABLE IF NOT EXISTS bot_blueprints (
    bot_id TEXT NOT NULL,
    blueprint_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 0, -- Default INACTIVE for safety
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
    FOREIGN KEY (blueprint_id) REFERENCES blueprints (id) ON DELETE CASCADE,
    PRIMARY KEY (bot_id, blueprint_id)
);


CREATE INDEX IF NOT EXISTS idx_bot_blueprints_active ON bot_blueprints (bot_id, is_active);

-- Customers table for CRM (Persistindo sessões)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    external_id TEXT NOT NULL, -- Telegram ID or Discord User ID
    provider TEXT NOT NULL CHECK (provider IN ('tg', 'dc')),
    name TEXT,
    username TEXT,
    metadata TEXT DEFAULT '{}', -- JSON com variaveis capturadas
    last_interaction TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    UNIQUE (tenant_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_customers_lookup ON customers (tenant_id, provider, external_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers (tenant_id);

-- Customer History (Snapshots)
CREATE TABLE IF NOT EXISTS customer_history (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    metadata TEXT NOT NULL, 
    last_flow_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS idx_customer_history_lookup ON customer_history (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_history_tenant ON customer_history (tenant_id);

-- Payment Gateways (configured per tenant)
CREATE TABLE IF NOT EXISTS payment_gateways (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'stripe', 'pushinpay', 'asaas')),
    credentials TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant ON payment_gateways (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON payment_gateways (tenant_id, is_active);

-- Plans (sales plans per tenant)
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'BRL',
    type TEXT NOT NULL CHECK (type IN ('one_time', 'subscription')),
    interval_days INTEGER,
    is_active INTEGER DEFAULT 1,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS idx_plans_tenant ON plans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans (tenant_id, is_active);

-- Transactions (payment records)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_id TEXT,
    gateway_id TEXT NOT NULL,
    plan_id TEXT,
    bot_id TEXT,
    flow_id TEXT,
    external_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'refunded', 'cancelled')),
    payment_method TEXT DEFAULT 'pix',
    pix_code TEXT,
    pix_qrcode TEXT,
    metadata TEXT DEFAULT '{}',
    paid_at TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (gateway_id) REFERENCES payment_gateways (id),
    FOREIGN KEY (plan_id) REFERENCES plans (id),
    FOREIGN KEY (bot_id) REFERENCES bots (id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON transactions (gateway_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external ON transactions (external_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dates ON transactions (tenant_id, created_at);

-- Analytics Events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT,
    blueprint_id TEXT,
    step_id TEXT,
    user_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    FOREIGN KEY (bot_id) REFERENCES bots (id),
    FOREIGN KEY (blueprint_id) REFERENCES blueprints (id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON analytics_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_bot ON analytics_events (bot_id);
CREATE INDEX IF NOT EXISTS idx_analytics_blueprint ON analytics_events (blueprint_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at);

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