-- Migration 004: tag_source — track whether a tag came from a folder, filename, or is semantic/manual

ALTER TABLE tags ADD COLUMN tag_source VARCHAR(20) NOT NULL DEFAULT 'manual';
