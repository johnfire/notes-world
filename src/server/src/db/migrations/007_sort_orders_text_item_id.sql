-- Migration 007: change item_sort_orders.item_id from UUID (FK) to TEXT
-- Required so divider IDs ("divider:<uuid>") can be stored alongside item UUIDs.
-- The sort-orders domain treats all IDs as opaque strings per spec.

ALTER TABLE item_sort_orders
  DROP CONSTRAINT IF EXISTS item_sort_orders_item_id_fkey,
  ALTER COLUMN item_id TYPE TEXT;
