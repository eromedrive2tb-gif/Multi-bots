-- Analytics Events Table
-- Stores step execution events for metrics
CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    blueprint_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('step_enter', 'step_complete', 'step_error', 'flow_start', 'flow_complete', 'flow_abandon', 'button_click')),
    event_data TEXT, -- JSON for extra data (e.g., button callback, error message)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    FOREIGN KEY (bot_id) REFERENCES bots (id)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON analytics_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_blueprint ON analytics_events (tenant_id, blueprint_id);
CREATE INDEX IF NOT EXISTS idx_analytics_bot ON analytics_events (tenant_id, bot_id);
CREATE INDEX IF NOT EXISTS idx_analytics_step ON analytics_events (tenant_id, blueprint_id, step_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events (tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (tenant_id, created_at);
