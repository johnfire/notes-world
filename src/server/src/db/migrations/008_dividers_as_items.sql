-- Migration 008: replace dividers table with Divider item type
-- Dividers are now items with item_type = 'Divider' and title as label (empty string = no label).

DROP TABLE IF EXISTS dividers;

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_item_type_check;
ALTER TABLE items ADD CONSTRAINT items_item_type_check
  CHECK (item_type IN ('Untyped', 'Task', 'Idea', 'Note', 'Reminder', 'Divider'));
