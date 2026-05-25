CREATE TABLE IF NOT EXISTS user_api_keys (
  key_hash   TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'MCP',
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_api_keys_user_id_idx ON user_api_keys(user_id);
