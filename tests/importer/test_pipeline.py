"""Integration tests for ImportPipeline using fixture files and a mocked DB."""

import os
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest

from importer.pipeline import ImportPipeline

FIXTURES = Path(__file__).parent / 'fixtures'

# Ensure no API key so classifier uses fallback
os.environ.pop('ANTHROPIC_API_KEY', None)


def _make_conn():
    """Build a mock psycopg2 connection that satisfies pipeline usage."""
    cur = MagicMock()
    # import_hashes query returns nothing (all records are new)
    cur.fetchall.return_value = []
    # get_or_create_tag returns a uuid string
    cur.fetchone.return_value = ('00000000-0000-0000-0000-000000000099',)
    cur.__enter__ = lambda s: s
    cur.__exit__ = MagicMock(return_value=False)

    conn = MagicMock()
    conn.cursor.return_value = cur
    return conn


class TestImportPipelineFlat:
    def test_flat_files_found(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'flat'))
        assert report.files_found == 2
        assert report.files_processed == 2
        assert report.files_failed == 0

    def test_flat_some_records_imported(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'flat'))
        assert report.total_imported > 0

    def test_flat_no_skipped_on_first_run(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'flat'))
        assert report.total_skipped == 0

    def test_file_reports_present(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'flat'))
        assert len(report.file_reports) == 2

    def test_report_format_contains_root(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'flat'))
        formatted = report.format()
        assert 'Import Report' in formatted
        assert 'flat' in formatted

    def test_report_format_contains_filenames(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'flat'))
        formatted = report.format()
        assert 'Groceries.md' in formatted or '2day-do-this.md' in formatted


class TestImportPipelineNested:
    def test_nested_files_found(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'nested'))
        assert report.files_found == 2
        assert report.files_processed == 2

    def test_nested_imports_records(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'nested'))
        assert report.total_imported > 0


class TestImportPipelineEdgeCases:
    def test_empty_file_processed_no_errors(self):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(FIXTURES / 'edge_cases'))
        assert report.files_failed == 0
        # empty.md and only_headings.md should be processed but import 0 records
        total = sum(fr.imported for fr in report.file_reports)
        assert total == 0

    def test_empty_directory(self, tmp_path):
        conn = _make_conn()
        report = ImportPipeline(conn=conn).run(str(tmp_path))
        assert report.files_found == 0
        assert report.total_imported == 0


class TestImportPipelineDedup:
    def test_all_skipped_when_all_hashes_exist(self):
        """If import_hashes returns all hashes, nothing should be imported."""
        from importer.dedup import compute_hash
        from importer.walker import DirectoryWalker
        from importer.parser import StructuralParser
        from importer.classifier import SemanticClassifier

        # Pre-collect hashes for flat fixtures
        flat = FIXTURES / 'flat'
        walker = DirectoryWalker()
        parser = StructuralParser()
        classifier = SemanticClassifier()

        all_hashes = []
        for ctx in walker.walk(str(flat)):
            content = ctx.abs_path
            with open(ctx.abs_path, encoding='utf-8') as fh:
                content = fh.read()
            raw = parser.parse(ctx, content)
            classified, _ = classifier.classify(raw, ctx)
            for r in classified:
                all_hashes.append(compute_hash(r))

        # Now run pipeline with all hashes pre-existing
        cur = MagicMock()
        cur.fetchall.return_value = [(h,) for h in all_hashes]
        cur.fetchone.return_value = ('00000000-0000-0000-0000-000000000099',)
        cur.__enter__ = lambda s: s
        cur.__exit__ = MagicMock(return_value=False)
        conn = MagicMock()
        conn.cursor.return_value = cur

        report = ImportPipeline(conn=conn).run(str(flat))
        assert report.total_imported == 0
        assert report.total_skipped == len(all_hashes)
