"""Phase 2 — Semantic Classifier: one Claude API call per file."""

import json
import os
from dataclasses import dataclass

from .parser import RawRecord
from .walker import FileContext

VALID_ENTRY_TYPES = frozenset({
    'task', 'idea', 'reminder', 'note', 'goal',
    'shopping', 'reading', 'contact', 'motivational',
})

_SYSTEM_PROMPT = """\
You are a semantic classifier for personal notes.
You receive raw note entries from a markdown file as a JSON array.
Each entry has: line_number, syntax_type, source_section, raw_text.

Return a JSON array — one object per entry:
{
  "line_number": <same as input>,
  "entry_type": <one of: task, idea, reminder, note, goal, shopping,
                 reading, contact, motivational>,
  "clean_text": <the text, cleaned and normalized>,
  "confidence": <float 0.0 to 1.0>
}

Classification rules:
- task: something to be done (fix, send, contact, buy, apply)
- idea: a creative or business concept, speculation, possibility
- reminder: something not to forget, usually a noun phrase
- note: factual information, a reference, a number, a URL note
- goal: an aspiration, target, or something to achieve
- shopping: something to buy or acquire
- reading: a book, article, or resource to consume
- contact: a person or organization to reach out to
- motivational: an affirmation, philosophical statement, or principle

Use syntax_type and source_section as strong hints:
- checkbox_open in shopping/groceries section -> shopping
- bold_item in reading section -> reading
- plain line starting with "I " -> likely motivational
- numbered item in reading section -> reading

Target 85% accuracy. When genuinely uncertain assign the most
plausible type and set confidence below 0.4.

Return ONLY the JSON array. No preamble. No markdown fences.\
"""


@dataclass
class ClassifiedRecord:
    source_file: str
    source_section: str
    line_number: int
    syntax_type: str
    raw_text: str
    is_completed: bool
    attached_url: str
    entry_type: str
    clean_text: str
    confidence: float


def _fallback_entry_type(record: RawRecord) -> str:
    section = record.source_section.lower()
    stype = record.syntax_type

    if stype == 'checkbox_open':
        if any(k in section for k in ('shopping', 'groceries')):
            return 'shopping'
        if 'reading' in section:
            return 'reading'
        return 'task'
    if stype == 'checkbox_done':
        return 'task'
    if stype == 'numbered':
        return 'reading' if 'reading' in section else 'note'
    if stype == 'bold_item':
        return 'goal'
    if stype == 'bullet':
        return 'reminder'
    return 'note'


def _to_classified(record: RawRecord, entry_type: str, clean_text: str, confidence: float) -> ClassifiedRecord:
    return ClassifiedRecord(
        source_file=record.source_file,
        source_section=record.source_section,
        line_number=record.line_number,
        syntax_type=record.syntax_type,
        raw_text=record.raw_text,
        is_completed=record.is_completed,
        attached_url=record.attached_url,
        entry_type=entry_type,
        clean_text=clean_text,
        confidence=confidence,
    )


class SemanticClassifier:

    def __init__(self) -> None:
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        self._client = None
        if api_key:
            try:
                from anthropic import Anthropic
                self._client = Anthropic(api_key=api_key)
            except ImportError:
                print('WARNING: anthropic package not installed; using fallback classifier')

    @property
    def has_api(self) -> bool:
        return self._client is not None

    def classify(self, records: list[RawRecord], ctx: FileContext) -> tuple[list[ClassifiedRecord], bool]:
        """Returns (classified_records, fallback_used)."""
        if not records:
            return [], False

        if self._client:
            try:
                return self._classify_with_api(records), False
            except Exception as e:
                print(f'WARNING: Claude API failed for {ctx.filename}, using fallback: {e}')

        return self._classify_fallback(records), True

    def _classify_with_api(self, records: list[RawRecord]) -> list[ClassifiedRecord]:
        payload = [
            {
                'line_number': r.line_number,
                'syntax_type': r.syntax_type,
                'source_section': r.source_section,
                'raw_text': r.raw_text,
            }
            for r in records
        ]

        message = self._client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': json.dumps(payload)}],
        )

        raw_json = message.content[0].text.strip()
        results = json.loads(raw_json)
        lookup: dict[int, dict] = {r['line_number']: r for r in results}

        classified: list[ClassifiedRecord] = []
        for record in records:
            api_result = lookup.get(record.line_number)
            if api_result:
                entry_type = api_result.get('entry_type', 'note')
                if entry_type not in VALID_ENTRY_TYPES:
                    entry_type = 'note'
                classified.append(_to_classified(
                    record,
                    entry_type=entry_type,
                    clean_text=api_result.get('clean_text', record.raw_text),
                    confidence=float(api_result.get('confidence', 0.5)),
                ))
            else:
                classified.append(_to_classified(
                    record,
                    entry_type=_fallback_entry_type(record),
                    clean_text=record.raw_text,
                    confidence=0.3,
                ))

        return classified

    def _classify_fallback(self, records: list[RawRecord]) -> list[ClassifiedRecord]:
        return [
            _to_classified(
                r,
                entry_type=_fallback_entry_type(r),
                clean_text=r.raw_text,
                confidence=0.3,
            )
            for r in records
        ]
