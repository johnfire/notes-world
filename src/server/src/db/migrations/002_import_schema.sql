-- Migration 002: Import domain tables

CREATE TABLE import_jobs (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID         NOT NULL,
  source_filename  VARCHAR(255) NOT NULL,
  source_size      INTEGER      NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'Pending',
  items_found      INTEGER      NOT NULL DEFAULT 0,
  items_imported   INTEGER      NOT NULL DEFAULT 0,
  items_skipped    INTEGER      NOT NULL DEFAULT 0,
  items_failed     INTEGER      NOT NULL DEFAULT 0,
  auto_tag         VARCHAR(100),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_user_id ON import_jobs (user_id);

CREATE TABLE import_records (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_job_id  UUID         NOT NULL REFERENCES import_jobs (id) ON DELETE CASCADE,
  sequence       INTEGER      NOT NULL,
  raw_title      VARCHAR(300),
  raw_body       TEXT,
  status         VARCHAR(20)  NOT NULL,
  created_item_id UUID        REFERENCES items (id) ON DELETE SET NULL,
  error_message  TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_records_job ON import_records (import_job_id);
