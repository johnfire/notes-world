"""Phase 1 — Structural Parser: parse markdown files into RawRecord objects."""

import re
from dataclasses import dataclass, field

from .walker import FileContext

MAX_LINE_LENGTH = 500


@dataclass
class RawRecord:
    source_file: str
    source_section: str
    line_number: int
    syntax_type: str    # checkbox_open | checkbox_done | bullet | numbered | bold_item | plain
    raw_text: str
    is_completed: bool
    attached_url: str = ''


_URL_RE = re.compile(r'^https?://\S+$')
_DIVIDER_RE = re.compile(r'^[-=]{3,}$')
_HEADING_RE = re.compile(r'^#{1,6}\s+(.+)')
_BOLD_HEADING_RE = re.compile(r'^\*\*(.+?)\s*:\s*\*\*$')
_STRIKETHROUGH_RE = re.compile(r'~~(.+?)~~')

_CB_DONE_RE = re.compile(r'^-\s+\[[xX]\]\s*(.*)')
_CB_DONE_STRIKE_RE = re.compile(r'^-\s+\[\s*\]\s*~~(.+?)~~\s*$')
_CB_OPEN_RE = re.compile(r'^-\s+\[\s*\]\s*(.*)')
_NUMBERED_RE = re.compile(r'^\d+\.\s+(.*)')
_BULLET_RE = re.compile(r'^-\s+(.*)')
_BOLD_ITEM_RE = re.compile(r'^\*\*(.+?)\*\*$')


class StructuralParser:

    def parse(self, ctx: FileContext, content: str) -> list[RawRecord]:
        records: list[RawRecord] = []
        lines = content.splitlines()
        current_section = 'root'

        for lineno, raw_line in enumerate(lines, 1):
            try:
                line = raw_line.strip()

                if not line:
                    continue
                if _DIVIDER_RE.match(line):
                    continue

                # Markdown heading → update section, no record
                m = _HEADING_RE.match(line)
                if m:
                    current_section = m.group(1).strip()
                    continue

                # Bold section heading: **text:** or **text :**
                m = _BOLD_HEADING_RE.match(line)
                if m:
                    current_section = m.group(1).strip()
                    continue

                # Bare URL → attach to previous record
                if _URL_RE.match(line):
                    if records:
                        records[-1].attached_url = line
                    continue

                syntax_type, text, is_completed = self._classify_line(line)

                if not text:
                    continue

                # Discard pure-number lines
                if re.match(r'^\d+$', text):
                    continue

                if len(text) > MAX_LINE_LENGTH:
                    print(f'WARNING: Truncating long line at {ctx.filename}:{lineno}')
                    text = text[:MAX_LINE_LENGTH]

                records.append(RawRecord(
                    source_file=ctx.filename,
                    source_section=current_section,
                    line_number=lineno,
                    syntax_type=syntax_type,
                    raw_text=text,
                    is_completed=is_completed,
                ))

            except Exception as e:  # noqa: BLE001
                print(f'WARNING: Error parsing {ctx.filename}:{lineno}: {e}')

        return records

    def _classify_line(self, line: str) -> tuple[str, str, bool]:
        # checkbox_done: - [x] text
        m = _CB_DONE_RE.match(line)
        if m:
            text = _STRIKETHROUGH_RE.sub(r'\1', m.group(1)).strip()
            return 'checkbox_done', text, True

        # checkbox_done via strikethrough: - [ ] ~~text~~
        m = _CB_DONE_STRIKE_RE.match(line)
        if m:
            return 'checkbox_done', m.group(1).strip(), True

        # checkbox_open: - [ ] text
        m = _CB_OPEN_RE.match(line)
        if m:
            return 'checkbox_open', m.group(1).strip(), False

        # numbered: 1. text
        m = _NUMBERED_RE.match(line)
        if m:
            return 'numbered', m.group(1).strip(), False

        # bullet: - text
        m = _BULLET_RE.match(line)
        if m:
            return 'bullet', m.group(1).strip(), False

        # bold_item: **text** (standalone — not a section heading because no colon)
        m = _BOLD_ITEM_RE.match(line)
        if m:
            return 'bold_item', m.group(1).strip(), False

        # plain text
        return 'plain', line, False
