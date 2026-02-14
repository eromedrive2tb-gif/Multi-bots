-- Analytics Events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT,
    blueprint_id TEXT,
    step_id TEXT,
    user_id TEXT,
    event_type TEXT NOT NULL, -- 'flow_start', 'flow_complete', 'step_enter', 'step_complete', 'step_error'
    event_data TEXT, -- JSON
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
