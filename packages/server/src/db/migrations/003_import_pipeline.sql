-- Migration 003: Import pipeline — semantic import tables + item metadata columns

-- ─── Extend items for import pipeline metadata ────────────────────────────────

ALTER TABLE items ADD COLUMN source_file     TEXT;
ALTER TABLE items ADD COLUMN source_section  TEXT;
ALTER TABLE items ADD COLUMN entry_type      TEXT;
ALTER TABLE items ADD COLUMN syntax_type     TEXT;
ALTER TABLE items ADD COLUMN is_completed    BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN confidence      REAL;
ALTER TABLE items ADD COLUMN import_batch_id UUID;

-- ─── Import Batches ───────────────────────────────────────────────────────────

CREATE TABLE import_batches (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID        NOT NULL,
    imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_file   TEXT        NOT NULL,
    root_dir      TEXT        NOT NULL,
    total_lines   INT         DEFAULT 0,
    imported      INT         DEFAULT 0,
    skipped       INT         DEFAULT 0,
    errors        INT         DEFAULT 0,
    fallback_used BOOLEAN     DEFAULT FALSE
);

CREATE INDEX idx_import_batches_user ON import_batches (user_id);

-- ─── Import Hashes (dedup) ────────────────────────────────────────────────────

CREATE TABLE import_hashes (
    hash        TEXT        PRIMARY KEY,
    batch_id    UUID        NOT NULL REFERENCES import_batches(id),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FK from items to import_batches ─────────────────────────────────────────

ALTER TABLE items ADD CONSTRAINT fk_items_import_batch
    FOREIGN KEY (import_batch_id) REFERENCES import_batches(id);
