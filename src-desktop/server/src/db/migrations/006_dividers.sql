-- Migration 006: dividers — labelled separators for ordered lists

CREATE TABLE dividers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL,
  label      VARCHAR(100),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dividers_user ON dividers (user_id, created_at ASC);
