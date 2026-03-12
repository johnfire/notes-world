"""Tests for DirectoryWalker."""

import os
from pathlib import Path

import pytest

from importer.walker import DirectoryWalker, normalize_tag

FIXTURES = Path(__file__).parent / 'fixtures'


def _stems(contexts):
    return [c.filename_stem for c in contexts]


def _filenames(contexts):
    return [c.filename for c in contexts]


class TestNormalizeTag:
    def test_lowercase(self):
        assert normalize_tag('Work') == 'work'

    def test_hyphen_to_space(self):
        assert normalize_tag('Work-hunt-and-Future') == 'work hunt and future'

    def test_underscore_to_space(self):
        assert normalize_tag('my_notes') == 'my notes'

    def test_truncate_at_50(self):
        long = 'a' * 60
        assert len(normalize_tag(long)) == 50

    def test_strips_whitespace(self):
        assert normalize_tag('  hello  ') == 'hello'


class TestDirectoryWalker:

    def test_flat_directory(self, tmp_path):
        (tmp_path / 'a.md').write_text('hello')
        (tmp_path / 'b.md').write_text('world')
        (tmp_path / 'ignore.txt').write_text('x')

        results = list(DirectoryWalker().walk(str(tmp_path)))
        assert sorted(_filenames(results)) == ['a.md', 'b.md']

    def test_path_tags_empty_for_root_files(self, tmp_path):
        (tmp_path / 'notes.md').write_text('hello')
        results = list(DirectoryWalker().walk(str(tmp_path)))
        assert results[0].path_tags == []

    def test_nested_path_tags(self):
        results = list(DirectoryWalker().walk(str(FIXTURES / 'nested')))
        by_file = {c.filename: c for c in results}

        wh = by_file['Work-hunt-and-Future.md']
        assert wh.path_tags == ['personal', 'work'] or set(wh.path_tags) == {'work'}

        gt = by_file['General-To-dos.md']
        assert 'personal' in gt.path_tags

    def test_filename_stem_normalized(self):
        results = list(DirectoryWalker().walk(str(FIXTURES / 'nested')))
        by_file = {c.filename: c for c in results}
        assert by_file['Work-hunt-and-Future.md'].filename_stem == 'work hunt and future'
        assert by_file['General-To-dos.md'].filename_stem == 'general to dos'

    def test_skips_hidden_files(self, tmp_path):
        (tmp_path / '.hidden.md').write_text('secret')
        (tmp_path / 'visible.md').write_text('ok')
        results = list(DirectoryWalker().walk(str(tmp_path)))
        assert _filenames(results) == ['visible.md']

    def test_skips_hidden_dirs(self, tmp_path):
        hidden = tmp_path / '.git'
        hidden.mkdir()
        (hidden / 'notes.md').write_text('x')
        (tmp_path / 'real.md').write_text('ok')
        results = list(DirectoryWalker().walk(str(tmp_path)))
        assert _filenames(results) == ['real.md']

    def test_skips_large_files(self, tmp_path):
        big = tmp_path / 'big.md'
        big.write_bytes(b'x' * (1_000_001))
        small = tmp_path / 'small.md'
        small.write_text('ok')
        results = list(DirectoryWalker().walk(str(tmp_path)))
        assert _filenames(results) == ['small.md']

    def test_fixture_flat(self):
        results = list(DirectoryWalker().walk(str(FIXTURES / 'flat')))
        names = sorted(_filenames(results))
        assert '2day-do-this.md' in names
        assert 'Groceries.md' in names

    def test_flat_file_path_tags_empty(self):
        results = list(DirectoryWalker().walk(str(FIXTURES / 'flat')))
        for ctx in results:
            assert ctx.path_tags == []
