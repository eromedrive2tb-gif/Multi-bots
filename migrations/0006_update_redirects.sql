-- Migration: Update redirects table with new features
-- Up
ALTER TABLE redirects ADD COLUMN destination_type TEXT DEFAULT 'url'; -- 'url' or 'bot'
ALTER TABLE redirects ADD COLUMN bot_id TEXT;
ALTER TABLE redirects ADD COLUMN flow_id TEXT;
ALTER TABLE redirects ADD COLUMN cloaker_method TEXT DEFAULT 'redirect'; -- 'redirect', 'safe_page', 'mirror'
ALTER TABLE redirects ADD COLUMN pixel_id TEXT;
