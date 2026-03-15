-- Migration 005: item_sort_orders — per-context drag-and-drop ordering
-- context_key examples: "tag:<tag_id>", "maturity:Seed"

CREATE TABLE item_sort_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL,
  context_key  VARCHAR(200) NOT NULL,
  item_id      UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, context_key, item_id)
);

CREATE INDEX idx_item_sort_orders_context ON item_sort_orders (user_id, context_key, sort_order ASC);
