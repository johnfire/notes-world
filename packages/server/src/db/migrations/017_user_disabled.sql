-- Admin can disable an account: blocks login/refresh without deleting data.

ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
