"""Tests for SemanticClassifier fallback logic (no API key required)."""

import os

import pytest

from importer.parser import RawRecord
from importer.walker import FileContext
from importer.classifier import SemanticClassifier, _fallback_entry_type


def _record(syntax_type='checkbox_open', section='root', text='do something'):
    return RawRecord(
        source_file='test.md',
        source_section=section,
        line_number=1,
        syntax_type=syntax_type,
        raw_text=text,
        is_completed=False,
    )


def _ctx():
    return FileContext(
        abs_path='/tmp/test.md',
        filename='test.md',
        filename_stem='test',
        path_tags=[],
    )


class TestFallbackEntryType:
    def test_checkbox_open_default_task(self):
        assert _fallback_entry_type(_record('checkbox_open', 'General Stuff')) == 'task'

    def test_checkbox_open_shopping_section(self):
        assert _fallback_entry_type(_record('checkbox_open', 'Shopping')) == 'shopping'

    def test_checkbox_open_groceries_section(self):
        assert _fallback_entry_type(_record('checkbox_open', 'Groceries')) == 'shopping'

    def test_checkbox_open_reading_section(self):
        assert _fallback_entry_type(_record('checkbox_open', 'Reading')) == 'reading'

    def test_checkbox_done_is_task(self):
        assert _fallback_entry_type(_record('checkbox_done', 'anything')) == 'task'

    def test_numbered_reading_section(self):
        assert _fallback_entry_type(_record('numbered', 'Reading list')) == 'reading'

    def test_numbered_other_section(self):
        assert _fallback_entry_type(_record('numbered', 'General')) == 'note'

    def test_bold_item_is_goal(self):
        assert _fallback_entry_type(_record('bold_item', 'Long term')) == 'goal'

    def test_bullet_is_reminder(self):
        assert _fallback_entry_type(_record('bullet', 'anything')) == 'reminder'

    def test_plain_is_note(self):
        assert _fallback_entry_type(_record('plain', 'anything')) == 'note'


class TestSemanticClassifierFallback:
    """Tests that run without an API key (fallback path)."""

    def setup_method(self):
        # Ensure no API key so fallback is used
        os.environ.pop('ANTHROPIC_API_KEY', None)
        self.clf = SemanticClassifier()

    def test_no_api_key_means_no_client(self):
        assert not self.clf.has_api

    def test_classify_returns_same_count(self):
        records = [_record('checkbox_open', 'General', f'task {i}') for i in range(5)]
        classified, fallback_used = self.clf.classify(records, _ctx())
        assert len(classified) == len(records)
        assert fallback_used is True

    def test_fallback_confidence_is_0_3(self):
        records = [_record()]
        classified, _ = self.clf.classify(records, _ctx())
        assert classified[0].confidence == 0.3

    def test_fallback_preserves_raw_text(self):
        records = [_record(text='buy milk')]
        classified, _ = self.clf.classify(records, _ctx())
        assert classified[0].clean_text == 'buy milk'

    def test_empty_records_returns_empty(self):
        classified, fallback_used = self.clf.classify([], _ctx())
        assert classified == []
        assert fallback_used is False

    def test_classified_record_has_all_fields(self):
        records = [_record()]
        classified, _ = self.clf.classify(records, _ctx())
        r = classified[0]
        assert hasattr(r, 'entry_type')
        assert hasattr(r, 'clean_text')
        assert hasattr(r, 'confidence')
        assert hasattr(r, 'source_file')
        assert hasattr(r, 'is_completed')
        assert hasattr(r, 'attached_url')
