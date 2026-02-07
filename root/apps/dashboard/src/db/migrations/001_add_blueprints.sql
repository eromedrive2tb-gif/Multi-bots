-- Migration: Add blueprints table
-- Run with: wrangler d1 execute multi-bots-db --file=root/apps/dashboard/src/db/migrations/001_add_blueprints.sql

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
