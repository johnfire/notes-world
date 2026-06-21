-- Migration 018: item hierarchy (subitems / tree)
-- A global, single-parent adjacency list. Nesting is type-agnostic — any item
-- type can be a child of any other (a Note under a Task, etc.).
-- ON DELETE SET NULL: purging a parent orphans its children (they float back to
-- the root) rather than cascade-deleting them.

ALTER TABLE items ADD COLUMN parent_id UUID DEFAULT NULL REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent_id);
