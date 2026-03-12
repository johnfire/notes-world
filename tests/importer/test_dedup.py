"""Tests for DedupValidator and compute_hash."""

from unittest.mock import MagicMock

import pytest

from importer.classifier import ClassifiedRecord
from importer.dedup import DedupValidator, compute_hash


def _record(source_file='test.md', line_number=1, raw_text='do something', entry_type='task'):
    return ClassifiedRecord(
        source_file=source_file,
        source_section='root',
        line_number=line_number,
        syntax_type='checkbox_open',
        raw_text=raw_text,
        is_completed=False,
        attached_url='',
        entry_type=entry_type,
        clean_text=raw_text,
        confidence=0.9,
    )


def _mock_conn(existing_hashes=None):
    """Return a mock psycopg2 connection whose cursor returns existing_hashes."""
    existing_hashes = existing_hashes or []
    cur = MagicMock()
    cur.fetchall.return_value = [(h,) for h in existing_hashes]
    cur.__enter__ = lambda s: s
    cur.__exit__ = MagicMock(return_value=False)

    conn = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


class TestComputeHash:
    def test_deterministic(self):
        r = _record()
        assert compute_hash(r) == compute_hash(r)

    def test_different_line_number(self):
        r1 = _record(line_number=1)
        r2 = _record(line_number=2)
        assert compute_hash(r1) != compute_hash(r2)

    def test_different_text(self):
        r1 = _record(raw_text='task one')
        r2 = _record(raw_text='task two')
        assert compute_hash(r1) != compute_hash(r2)

    def test_different_file(self):
        r1 = _record(source_file='a.md')
        r2 = _record(source_file='b.md')
        assert compute_hash(r1) != compute_hash(r2)

    def test_returns_hex_string(self):
        h = compute_hash(_record())
        assert len(h) == 64
        int(h, 16)  # must be valid hex


class TestDedupValidator:
    def test_all_new_records_imported(self):
        conn, _ = _mock_conn(existing_hashes=[])
        records = [_record(line_number=i) for i in range(3)]
        to_import, skipped = DedupValidator(conn).filter(records)
        assert len(to_import) == 3
        assert len(skipped) == 0

    def test_existing_hash_skipped(self):
        r = _record()
        h = compute_hash(r)
        conn, _ = _mock_conn(existing_hashes=[h])
        to_import, skipped = DedupValidator(conn).filter([r])
        assert len(to_import) == 0
        assert len(skipped) == 1

    def test_partial_overlap(self):
        r1 = _record(line_number=1)
        r2 = _record(line_number=2)
        h1 = compute_hash(r1)
        conn, _ = _mock_conn(existing_hashes=[h1])
        to_import, skipped = DedupValidator(conn).filter([r1, r2])
        assert len(to_import) == 1
        assert len(skipped) == 1
        assert to_import[0][0].line_number == 2

    def test_empty_clean_text_filtered(self):
        r = _record()
        r.clean_text = ''
        conn, _ = _mock_conn()
        to_import, _ = DedupValidator(conn).filter([r])
        assert len(to_import) == 0

    def test_invalid_entry_type_filtered(self):
        r = _record(entry_type='unknown_type')
        conn, _ = _mock_conn()
        to_import, _ = DedupValidator(conn).filter([r])
        assert len(to_import) == 0

    def test_empty_source_file_filtered(self):
        r = _record(source_file='')
        conn, _ = _mock_conn()
        to_import, _ = DedupValidator(conn).filter([r])
        assert len(to_import) == 0

    def test_empty_records_returns_empty(self):
        conn, _ = _mock_conn()
        to_import, skipped = DedupValidator(conn).filter([])
        assert to_import == []
        assert skipped == []

    def test_hash_queried_from_db(self):
        r = _record()
        conn, cur = _mock_conn()
        DedupValidator(conn).filter([r])
        cur.execute.assert_called_once()
        call_args = cur.execute.call_args[0]
        assert 'import_hashes' in call_args[0]

    def test_to_import_contains_hash(self):
        r = _record()
        conn, _ = _mock_conn()
        to_import, _ = DedupValidator(conn).filter([r])
        assert len(to_import) == 1
        record_out, hash_out = to_import[0]
        assert hash_out == compute_hash(r)
        assert record_out is r
