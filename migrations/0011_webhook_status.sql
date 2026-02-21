-- Add status column to processed_webhooks for better retry handling
ALTER TABLE processed_webhooks ADD COLUMN status TEXT DEFAULT 'completed';
