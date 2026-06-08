-- Migration 016: Checklists (shopping lists)
-- A checklist has a title; checklist_items each have a name and a checked flag.

CREATE TABLE checklists (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL,
  title       VARCHAR(300) NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_user_id ON checklists (user_id);

CREATE TABLE checklist_items (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id  UUID         NOT NULL REFERENCES checklists (id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL,
  name          VARCHAR(300) NOT NULL,
  checked       BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_checklist ON checklist_items (checklist_id);
