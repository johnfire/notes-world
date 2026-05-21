-- Migration 001: Initial schema for Phase 1
-- Items, Tags, ItemTags, Dashboards, Blocks

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Items ───────────────────────────────────────────────────────────────────

CREATE TABLE items (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL,
  title       VARCHAR(300) NOT NULL,
  body        TEXT,
  item_type   VARCHAR(20)  NOT NULL DEFAULT 'Untyped',
  status      VARCHAR(20)  NOT NULL DEFAULT 'Active',
  type_data   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_user_id           ON items (user_id);
CREATE INDEX idx_items_user_status       ON items (user_id, status);
CREATE INDEX idx_items_user_type         ON items (user_id, item_type);
CREATE INDEX idx_items_user_type_status  ON items (user_id, item_type, status);
CREATE INDEX idx_items_updated_at        ON items (updated_at DESC);
CREATE INDEX idx_items_title_fts         ON items USING gin (to_tsvector('english', title));
CREATE INDEX idx_items_body_fts          ON items USING gin (to_tsvector('english', COALESCE(body, '')));

-- ─── Tags ────────────────────────────────────────────────────────────────────

CREATE TABLE tags (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX idx_tags_user_id    ON tags (user_id);

-- ─── Item Tags ───────────────────────────────────────────────────────────────

CREATE TABLE item_tags (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID        NOT NULL REFERENCES items  (id) ON DELETE CASCADE,
  tag_id      UUID        NOT NULL REFERENCES tags   (id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, tag_id)
);

CREATE INDEX idx_item_tags_item    ON item_tags (item_id);
CREATE INDEX idx_item_tags_tag     ON item_tags (tag_id);

-- ─── Dashboards ──────────────────────────────────────────────────────────────

CREATE TABLE dashboards (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    NOT NULL UNIQUE,
  columns     INTEGER NOT NULL DEFAULT 3 CHECK (columns BETWEEN 1 AND 4),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dashboards_user_id ON dashboards (user_id);

-- ─── Blocks ──────────────────────────────────────────────────────────────────

CREATE TABLE blocks (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  dashboard_id  UUID         NOT NULL REFERENCES dashboards (id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL,
  view_type     VARCHAR(30)  NOT NULL,
  title         VARCHAR(100),
  row           INTEGER      NOT NULL DEFAULT 0 CHECK (row >= 0),
  col           INTEGER      NOT NULL DEFAULT 0 CHECK (col >= 0),
  config        JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocks_dashboard ON blocks (dashboard_id);
CREATE INDEX idx_blocks_user_id   ON blocks (user_id);

-- ─── Dependencies (schema-only, implemented in Phase 2) ──────────────────────

CREATE TABLE dependencies (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dependent_id  UUID        NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  dependency_id UUID        NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  removed_at    TIMESTAMPTZ,
  UNIQUE (dependent_id, dependency_id)
);

CREATE INDEX idx_dependencies_dependent  ON dependencies (dependent_id);
CREATE INDEX idx_dependencies_dependency ON dependencies (dependency_id);
CREATE INDEX idx_dependencies_dep_status ON dependencies (dependent_id, status);

-- ─── Cross References (schema-only, implemented in Phase 2) ──────────────────

CREATE TABLE cross_references (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_a_id   UUID        NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  item_b_id   UUID        NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_a_id, item_b_id)
);

CREATE INDEX idx_cross_refs_item_a ON cross_references (item_a_id);
CREATE INDEX idx_cross_refs_item_b ON cross_references (item_b_id);
