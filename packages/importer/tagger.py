"""Phase 3 — Tag Builder: assemble tag set per record deterministically."""

import re

from .classifier import ClassifiedRecord
from .walker import FileContext


def normalize_tag(tag: str) -> str:
    return re.sub(r'[-_]+', ' ', tag).strip().lower()[:50]


def build_tags(record: ClassifiedRecord, ctx: FileContext) -> list[tuple[str, str]]:
    """Return list of (normalized_name, tag_source) sorted by name.

    tag_source values: 'folder' | 'file' | 'semantic'
    """
    seen: set[str] = set()
    result: list[tuple[str, str]] = []

    def add(name: str, source: str) -> None:
        n = normalize_tag(name)
        if n and n not in seen:
            seen.add(n)
            result.append((n, source))

    for t in ctx.path_tags:
        add(t, 'folder')

    add(ctx.filename_stem, 'file')
    add(record.entry_type, 'semantic')

    if record.confidence < 0.4:
        add('unsure', 'semantic')
    if record.is_completed:
        add('completed', 'semantic')

    return sorted(result, key=lambda x: x[0])
