"""Phase 4 — Dedup + Validate: SHA-256 keyed deduplication against import_hashes."""

import hashlib
from typing import Any

from .classifier import ClassifiedRecord, VALID_ENTRY_TYPES


def compute_hash(record: ClassifiedRecord) -> str:
    key = f'{record.source_file}|{record.line_number}|{record.raw_text}'
    return hashlib.sha256(key.encode('utf-8')).hexdigest()


class DedupValidator:

    def __init__(self, conn: Any) -> None:
        self.conn = conn

    def filter(
        self,
        records: list[ClassifiedRecord],
    ) -> tuple[list[tuple[ClassifiedRecord, str]], list[str]]:
        """Return (to_import, skipped_hashes).

        to_import: list of (record, hash) that passed dedup + validation.
        skipped_hashes: hashes already in import_hashes.
        """
        if not records:
            return [], []

        hashes = [compute_hash(r) for r in records]

        with self.conn.cursor() as cur:
            cur.execute(
                'SELECT hash FROM import_hashes WHERE hash = ANY(%s)',
                (hashes,),
            )
            existing: set[str] = {row[0] for row in cur.fetchall()}

        to_import: list[tuple[ClassifiedRecord, str]] = []
        skipped: list[str] = []

        for record, h in zip(records, hashes):
            if h in existing:
                skipped.append(h)
                continue
            if not self._valid(record):
                continue
            to_import.append((record, h))

        return to_import, skipped

    def _valid(self, record: ClassifiedRecord) -> bool:
        if not record.clean_text:
            return False
        if record.entry_type not in VALID_ENTRY_TYPES:
            return False
        if not record.source_file:
            return False
        return True
