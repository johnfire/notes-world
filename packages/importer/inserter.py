"""Phase 5 — DB Insert: one transaction per file, rollback on failure."""

import json
import os
import uuid
from typing import Any

from .classifier import ClassifiedRecord
from .tagger import build_tags
from .walker import FileContext

PHASE1_USER_ID = os.environ.get('PHASE1_USER_ID', '00000000-0000-0000-0000-000000000001')

_ITEM_TYPE_MAP = {
    'task': 'Task',
    'shopping': 'Task',
    'idea': 'Note',
    'reminder': 'Note',
    'note': 'Note',
    'goal': 'Note',
    'reading': 'Note',
    'contact': 'Note',
    'motivational': 'Note',
}


class BatchInserter:

    def __init__(self, conn: Any, user_id: str | None = None) -> None:
        self.conn = conn
        self.user_id = user_id or PHASE1_USER_ID

    # ── Public API ─────────────────────────────────────────────────────────────

    def create_batch(self, source_file: str, root_dir: str) -> str:
        batch_id = str(uuid.uuid4())
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO import_batches
                   (id, user_id, imported_at, source_file, root_dir)
                   VALUES (%s, %s, NOW(), %s, %s)""",
                (batch_id, self.user_id, source_file, root_dir),
            )
        self.conn.commit()
        return batch_id

    def update_batch(
        self,
        batch_id: str,
        total_lines: int,
        imported: int,
        skipped: int,
        errors: int,
        fallback_used: bool,
    ) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """UPDATE import_batches
                   SET total_lines=%s, imported=%s, skipped=%s,
                       errors=%s, fallback_used=%s
                   WHERE id=%s""",
                (total_lines, imported, skipped, errors, fallback_used, batch_id),
            )
        self.conn.commit()

    def insert_batch(
        self,
        batch_id: str,
        records_with_hashes: list[tuple[ClassifiedRecord, str]],
        ctx: FileContext,
    ) -> tuple[int, int]:
        """Insert all records for one file in a single transaction.

        Returns (imported_count, error_count).
        On catastrophic failure rolls back the whole file and re-raises.
        """
        imported = 0
        errors = 0

        try:
            with self.conn.cursor() as cur:
                for record, hash_val in records_with_hashes:
                    try:
                        self._insert_one(cur, batch_id, record, hash_val, ctx)
                        imported += 1
                    except Exception as e:  # noqa: BLE001
                        errors += 1
                        print(
                            f'ERROR: Failed to insert {ctx.filename}:'
                            f'{record.line_number}: {e}'
                        )
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(f'ERROR: Transaction rolled back for {ctx.filename}: {e}')
            raise

        return imported, errors

    # ── Private helpers ────────────────────────────────────────────────────────

    def _insert_one(
        self,
        cur: Any,
        batch_id: str,
        record: ClassifiedRecord,
        hash_val: str,
        ctx: FileContext,
    ) -> None:
        item_id = str(uuid.uuid4())
        title = record.clean_text[:300]
        body = record.attached_url if record.attached_url else None
        item_type = _ITEM_TYPE_MAP.get(record.entry_type, 'Note')
        status = 'Archived' if record.is_completed else 'Active'
        type_data = self._build_type_data(record)

        cur.execute(
            """INSERT INTO items
               (id, user_id, title, body, item_type, status,
                source_file, source_section, entry_type, syntax_type,
                is_completed, confidence, import_batch_id,
                created_at, updated_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())""",
            (
                item_id, self.user_id, title, body, item_type, status,
                record.source_file, record.source_section,
                record.entry_type, record.syntax_type,
                record.is_completed, record.confidence,
                batch_id,
            ),
        )

        if type_data:
            cur.execute(
                'UPDATE items SET type_data = %s WHERE id = %s',
                (json.dumps(type_data), item_id),
            )

        # Tags
        tags = build_tags(record, ctx)
        for tag_name, tag_source in tags:
            tag_id = self._get_or_create_tag(cur, tag_name, tag_source)
            cur.execute(
                """INSERT INTO item_tags (id, item_id, tag_id, user_id)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT DO NOTHING""",
                (str(uuid.uuid4()), item_id, tag_id, self.user_id),
            )

        # Dedup hash
        cur.execute(
            'INSERT INTO import_hashes (hash, batch_id, imported_at) VALUES (%s, %s, NOW())',
            (hash_val, batch_id),
        )

    def _get_or_create_tag(self, cur: Any, name: str, tag_source: str = 'manual') -> str:
        cur.execute(
            'SELECT id FROM tags WHERE user_id = %s AND name = %s',
            (self.user_id, name),
        )
        row = cur.fetchone()
        if row:
            return row[0]

        tag_id = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO tags (id, user_id, name, tag_source)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
               RETURNING id""",
            (tag_id, self.user_id, name, tag_source),
        )
        row = cur.fetchone()
        return row[0]

    def _build_type_data(self, record: ClassifiedRecord) -> dict | None:
        if record.entry_type in ('task', 'shopping'):
            task_status = 'Completed' if record.is_completed else 'Open'
            return {'task_status': task_status, 'priority': 'Normal'}
        return None
