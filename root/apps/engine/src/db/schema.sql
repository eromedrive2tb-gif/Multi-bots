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