-- Migration 003: Payment Infrastructure
-- Adds payment_gateways, transactions, and plans tables

-- Gateways de pagamento configurados por tenant
CREATE TABLE IF NOT EXISTS payment_gateways (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'stripe', 'pushinpay', 'asaas')),
    credentials TEXT NOT NULL, -- JSON criptografado: {access_token, ...}
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant ON payment_gateways (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON payment_gateways (tenant_id, is_active);

-- Planos de venda por tenant
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- valor em centavos (ex: 9990 = R$ 99,90)
    currency TEXT DEFAULT 'BRL',
    type TEXT NOT NULL CHECK (type IN ('one_time', 'subscription')),
    interval_days INTEGER, -- para subscription (30, 90, 365, etc.)
    is_active INTEGER DEFAULT 1,
    metadata TEXT DEFAULT '{}', -- JSON: dados extras (features, limites, etc.)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS idx_plans_tenant ON plans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans (tenant_id, is_active);

-- Transações de pagamento
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_id TEXT,
    gateway_id TEXT NOT NULL,
    plan_id TEXT,
    bot_id TEXT,
    flow_id TEXT,
    external_id TEXT, -- ID no gateway externo
    amount INTEGER NOT NULL, -- centavos
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'refunded', 'cancelled')),
    payment_method TEXT DEFAULT 'pix',
    pix_code TEXT, -- código copia-e-cola
    pix_qrcode TEXT, -- base64 QR code
    metadata TEXT DEFAULT '{}', -- JSON: dados extras
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
