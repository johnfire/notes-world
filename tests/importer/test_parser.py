"""Tests for StructuralParser."""

from pathlib import Path

import pytest

from importer.walker import FileContext
from importer.parser import StructuralParser, RawRecord

FIXTURES = Path(__file__).parent / 'fixtures'


def _ctx(filename='test.md', stem='test', path_tags=None):
    return FileContext(
        abs_path=f'/tmp/{filename}',
        filename=filename,
        filename_stem=stem,
        path_tags=path_tags or [],
    )


def _parse(content: str, filename='test.md'):
    ctx = _ctx(filename)
    return StructuralParser().parse(ctx, content)


class TestCheckboxLines:
    def test_checkbox_open(self):
        records = _parse('- [ ] fix storage shed')
        assert len(records) == 1
        r = records[0]
        assert r.syntax_type == 'checkbox_open'
        assert r.raw_text == 'fix storage shed'
        assert r.is_completed is False

    def test_checkbox_done_x(self):
        records = _parse('- [x] pay bills')
        assert len(records) == 1
        r = records[0]
        assert r.syntax_type == 'checkbox_done'
        assert r.raw_text == 'pay bills'
        assert r.is_completed is True

    def test_checkbox_done_uppercase_x(self):
        records = _parse('- [X] pay bills')
        assert records[0].syntax_type == 'checkbox_done'
        assert records[0].is_completed is True

    def test_checkbox_done_strikethrough(self):
        records = _parse('- [ ] ~~done thing~~')
        assert len(records) == 1
        r = records[0]
        assert r.syntax_type == 'checkbox_done'
        assert r.raw_text == 'done thing'
        assert r.is_completed is True

    def test_checkbox_done_with_strikethrough_inside(self):
        records = _parse('- [x] ~~done task~~')
        assert records[0].raw_text == 'done task'
        assert records[0].is_completed is True


class TestOtherLineTypes:
    def test_bullet(self):
        records = _parse('- Walks and rides')
        assert records[0].syntax_type == 'bullet'
        assert records[0].raw_text == 'Walks and rides'
        assert records[0].is_completed is False

    def test_numbered(self):
        records = _parse('1. how fascism works')
        assert records[0].syntax_type == 'numbered'
        assert records[0].raw_text == 'how fascism works'

    def test_bold_item(self):
        records = _parse('**Make art**')
        assert records[0].syntax_type == 'bold_item'
        assert records[0].raw_text == 'Make art'

    def test_plain(self):
        records = _parse('I KNOW WHO I AM')
        assert records[0].syntax_type == 'plain'
        assert records[0].raw_text == 'I KNOW WHO I AM'


class TestSectionTracking:
    def test_markdown_heading_updates_section(self):
        content = '## General Stuff\n- [ ] task one'
        records = _parse(content)
        assert records[0].source_section == 'General Stuff'

    def test_bold_heading_updates_section(self):
        content = '**5 Japanese philosophies :**\n- [ ] wabi sabi'
        records = _parse(content)
        assert records[0].source_section == '5 Japanese philosophies'

    def test_default_section_is_root(self):
        records = _parse('- [ ] orphan task')
        assert records[0].source_section == 'root'

    def test_section_changes_carry_over(self):
        content = '## Section A\n- [ ] task a\n## Section B\n- [ ] task b'
        records = _parse(content)
        assert records[0].source_section == 'Section A'
        assert records[1].source_section == 'Section B'

    def test_heading_not_included_as_record(self):
        content = '## Main\n- [ ] task'
        records = _parse(content)
        assert len(records) == 1


class TestURLHandling:
    def test_url_attaches_to_previous(self):
        content = '- [ ] some task\nhttps://example.com'
        records = _parse(content)
        assert len(records) == 1
        assert records[0].attached_url == 'https://example.com'

    def test_url_no_previous_record_ignored(self):
        records = _parse('https://example.com')
        assert len(records) == 0

    def test_url_does_not_create_own_record(self):
        content = '- [ ] task\nhttps://example.com\n- [ ] other'
        records = _parse(content)
        assert len(records) == 2
        assert records[0].attached_url == 'https://example.com'
        assert records[1].attached_url == ''


class TestEdgeCases:
    def test_blank_lines_skipped(self):
        content = '\n\n- [ ] task\n\n'
        records = _parse(content)
        assert len(records) == 1

    def test_dividers_skipped(self):
        content = '---\n- [ ] task\n==='
        records = _parse(content)
        assert len(records) == 1

    def test_pure_number_line_discarded(self):
        records = _parse('42')
        assert len(records) == 0

    def test_long_line_truncated(self):
        long = '- [ ] ' + 'x' * 600
        records = _parse(long)
        assert len(records[0].raw_text) == 500

    def test_empty_after_strip_discarded(self):
        records = _parse('- [ ] ')
        assert len(records) == 0

    def test_line_number_1_indexed(self):
        records = _parse('- [ ] task')
        assert records[0].line_number == 1

    def test_source_file_set(self):
        records = _parse('- [ ] task', filename='notes.md')
        assert records[0].source_file == 'notes.md'


class TestFixtureFiles:
    def test_parse_groceries(self):
        path = FIXTURES / 'flat' / 'Groceries.md'
        ctx = FileContext(
            abs_path=str(path),
            filename='Groceries.md',
            filename_stem='groceries',
            path_tags=[],
        )
        records = StructuralParser().parse(ctx, path.read_text())
        assert len(records) > 0
        shopping_section = [r for r in records if r.source_section == 'Shopping']
        assert len(shopping_section) > 0

    def test_parse_2day(self):
        path = FIXTURES / 'flat' / '2day-do-this.md'
        ctx = FileContext(
            abs_path=str(path),
            filename='2day-do-this.md',
            filename_stem='2day do this',
            path_tags=[],
        )
        records = StructuralParser().parse(ctx, path.read_text())
        assert any(r.syntax_type == 'bold_item' for r in records)
        assert any(r.is_completed for r in records)
        # URL should be attached, not a standalone record
        url_records = [r for r in records if r.raw_text.startswith('http')]
        assert len(url_records) == 0
