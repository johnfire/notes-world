"""Tests for TagBuilder."""

import pytest

from importer.classifier import ClassifiedRecord
from importer.walker import FileContext
from importer.tagger import build_tags, normalize_tag


def _record(entry_type='task', confidence=0.8, is_completed=False):
    return ClassifiedRecord(
        source_file='test.md',
        source_section='root',
        line_number=1,
        syntax_type='checkbox_open',
        raw_text='do something',
        is_completed=is_completed,
        attached_url='',
        entry_type=entry_type,
        clean_text='do something',
        confidence=confidence,
    )


def _ctx(path_tags=None, stem='test'):
    return FileContext(
        abs_path='/tmp/test.md',
        filename='test.md',
        filename_stem=stem,
        path_tags=path_tags or [],
    )


def _names(tags):
    """Extract just names from (name, source) tuples."""
    return [name for name, _ in tags]


def _sources(tags):
    return [source for _, source in tags]


class TestNormalizeTag:
    def test_hyphen_to_space(self):
        assert normalize_tag('work-hunt') == 'work hunt'

    def test_underscore_to_space(self):
        assert normalize_tag('my_file') == 'my file'

    def test_lowercase(self):
        assert normalize_tag('WORK') == 'work'

    def test_truncate(self):
        assert len(normalize_tag('a' * 60)) == 50


class TestBuildTags:
    def test_includes_entry_type(self):
        assert 'task' in _names(build_tags(_record(entry_type='task'), _ctx()))

    def test_includes_filename_stem(self):
        assert 'groceries' in _names(build_tags(_record(), _ctx(stem='groceries')))

    def test_includes_path_tags(self):
        names = _names(build_tags(_record(), _ctx(path_tags=['notes', 'work'])))
        assert 'notes' in names
        assert 'work' in names

    def test_unsure_tag_when_low_confidence(self):
        assert 'unsure' in _names(build_tags(_record(confidence=0.3), _ctx()))

    def test_no_unsure_tag_when_high_confidence(self):
        assert 'unsure' not in _names(build_tags(_record(confidence=0.8), _ctx()))

    def test_completed_tag_when_is_completed(self):
        assert 'completed' in _names(build_tags(_record(is_completed=True), _ctx()))

    def test_no_completed_tag_when_not_completed(self):
        assert 'completed' not in _names(build_tags(_record(is_completed=False), _ctx()))

    def test_deduplicated_when_path_contains_stem(self):
        tags = build_tags(_record(entry_type='note'), _ctx(path_tags=['shopping'], stem='shopping'))
        assert _names(tags).count('shopping') == 1

    def test_sorted_output(self):
        tags = build_tags(_record(entry_type='task'), _ctx(path_tags=['zeta', 'alpha']))
        names = _names(tags)
        assert names == sorted(names)

    def test_path_tags_have_folder_source(self):
        tags = build_tags(_record(), _ctx(path_tags=['work']))
        lookup = dict(tags)
        assert lookup['work'] == 'folder'

    def test_filename_stem_has_file_source(self):
        tags = build_tags(_record(), _ctx(stem='groceries'))
        lookup = dict(tags)
        assert lookup['groceries'] == 'file'

    def test_entry_type_has_semantic_source(self):
        tags = build_tags(_record(entry_type='task'), _ctx())
        lookup = dict(tags)
        assert lookup['task'] == 'semantic'

    def test_unsure_has_semantic_source(self):
        tags = build_tags(_record(confidence=0.3), _ctx())
        lookup = dict(tags)
        assert lookup['unsure'] == 'semantic'

    def test_completed_has_semantic_source(self):
        tags = build_tags(_record(is_completed=True), _ctx())
        lookup = dict(tags)
        assert lookup['completed'] == 'semantic'

    def test_example_from_spec(self):
        record = _record(entry_type='task', confidence=0.8)
        ctx = FileContext(
            abs_path='/notes/work/Work-hunt-and-Future.md',
            filename='Work-hunt-and-Future.md',
            filename_stem='work hunt and future',
            path_tags=['notes', 'work'],
        )
        names = _names(build_tags(record, ctx))
        assert 'notes' in names
        assert 'work' in names
        assert 'work hunt and future' in names
        assert 'task' in names

    def test_groceries_dedup_example(self):
        record = _record(entry_type='shopping', confidence=0.95)
        ctx = FileContext(
            abs_path='/notes/shopping/Groceries.md',
            filename='Groceries.md',
            filename_stem='groceries',
            path_tags=['notes', 'shopping'],
        )
        tags = build_tags(record, ctx)
        names = _names(tags)
        assert names.count('shopping') == 1
        assert 'groceries' in names
        assert 'notes' in names
