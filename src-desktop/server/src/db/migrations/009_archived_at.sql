-- Migration 009: Add archived_at timestamp for 30-day trash retention
ALTER TABLE items ADD COLUMN archived_at TIMESTAMPTZ;

-- Backfill existing archived items with updated_at as archived_at
UPDATE items SET archived_at = updated_at WHERE status = 'Archived';

CREATE INDEX idx_items_archived_at ON items (archived_at) WHERE archived_at IS NOT NULL;
