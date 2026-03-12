# Architectural Annex — Markdown Import Pipeline
## Notes App — Import Subsystem

*Version 0.2 — March 2026*
*Status: Design spec for Claude Code implementation — all decisions resolved*
*Companion to: main app architecture*

---

## Resolved Design Decisions

| # | Decision | Answer |
|---|----------|--------|
| 1 | Import scope | Directories — all `.md` files found recursively |
| 2 | Completed items | Yes — import with `is_completed: True` |
| 3 | API availability | Claude API assumed available |
| 4 | Re-import behavior | One-time import only — additive, never updates |
| 5 | Review queue | Tag `unsure` — user filters manually, no separate view |
| 6 | Quality target | 85% correct classification is acceptable |
| 7 | Tagging strategy | Tags are cheap — generate all applicable tags per entry |

---

## Problem Statement

The user maintains a set of personal markdown files, organized in directories.
Each file is a topic-scoped collection of entries: tasks, goals, ideas,
reminders, shopping items, reading lists, and general notes. Files are flat
or lightly structured — headings give context to items beneath them.
Items are mostly single lines.

These files are not structured data. They are human-written, inconsistent
in format, and use markdown syntax loosely. The import pipeline must parse
them intelligently and produce normalized, tagged, categorized records
the app can store and display. 85% correct classification is the target;
the remaining ~15% surfaces via the `unsure` tag for manual review.

---

## File Anatomy — Observed Patterns

### Line Types (syntactic)

| Pattern | Example | Syntax Type |
|---------|---------|-------------|
| `- [ ] text` | `- [ ] fix storage shed` | checkbox_open |
| `- [x] text` | `- [x] done thing` | checkbox_done |
| `- text` | `- Walks and rides` | bullet |
| `1. text` | `1. how fascism works` | numbered |
| `**text**` (standalone bold line) | `**Make art**` | bold_item |
| plain text line | `I KNOW WHO I AM` | plain |
| `## text` or `# text` | `## General Stuff` | heading (section marker) |
| `**text :**` or `**text:**` | `**5 Japanese philosophies :**` | section_heading (bold) |
| `- [ ] ~~text~~` | strikethrough checkbox | checkbox_done (alt) |
| URL line | `https://pr.tn/ref/...` | url (attach to previous item) |

### Section Markers

A section marker provides categorical context for all items that follow
it until the next section marker or end of file. Both markdown headings
(`##`) and standalone bold lines (`**text**`) function as section markers.

Section names observed: `Main Plans and Projects`, `General todos`,
`Art this week`, `Computers`, `Reading`, `Long term later`,
`Possible jobs`, `Freelancing`, `To study for Interviews`, etc.

---

## Tagging Strategy

Tags are generated automatically from multiple sources and are additive.

### Tag Sources (per entry)

| Source | Example input | Tags generated |
|--------|---------------|----------------|
| Directory path components | `personal/shopping/` | `personal`, `shopping` |
| Filename stem | `Groceries.md` | `groceries` |
| Semantic entry_type | classified as `task` | `task` |
| `unsure` flag | confidence < 0.4 | `unsure` |
| `is_completed` flag | `- [x]` item | `completed` |

### Tag Normalization Rules

- Lowercase all tags
- Replace `-` and `_` with a space, then strip whitespace
- Deduplicate within an entry (directory name == filename stem → one tag)
- Maximum tag length: 50 chars; truncate silently

### Example

File at path: `notes/work/Work-hunt-and-Future.md`
Entry: `- [ ] apply to Rocket Loop` (classified as `task`, confidence 0.8)
Tags: `notes`, `work`, `work hunt and future`, `task`

File at path: `notes/shopping/Groceries.md`
Entry: `- [ ] almond milks` (classified as `shopping`, confidence 0.95)
Tags: `notes`, `shopping`, `groceries` (deduped — shopping appears once)

---

## Pipeline Architecture

```
[ Directory on Disk ]
         |
         v
  Directory Walker              (find all .md files recursively,
         |                       extract path components as proto-tags)
         v
  Phase 1: Structural Parser    (Python, deterministic)
         |
         v
  Raw Records
         |
         v
  Phase 2: Semantic Classifier  (Claude API, one call per file)
         |
         v
  Classified Records
         |
         v
  Phase 3: Tag Builder          (deterministic)
         |
         v
  Phase 4: Dedup + Validate     (Python, deterministic)
         |
         v
  Phase 5: DB Insert            (transaction per file, rollback on failure)
         |
         v
  Import Report
```

---

## Directory Walker

**Input:** A root directory path.

**Output:** A list of `FileContext` objects.

```python
@dataclass
class FileContext:
    abs_path: str           # full path to file
    filename: str           # e.g. "Groceries.md"
    filename_stem: str      # e.g. "groceries" (lowercased, normalized)
    path_tags: list[str]    # directory components as normalized tags
                            # root dir excluded; e.g. ["notes", "shopping"]
```

Rules: walk recursively; skip hidden files/dirs (`.` prefix); skip files
> 1MB (log warning); normalize each path component.

---

## Phase 1 — Structural Parser

**Input:** A `FileContext` and file content.

**Output:** A list of `RawRecord` objects.

```python
@dataclass
class RawRecord:
    source_file: str        # filename only, no path
    source_section: str     # last heading seen, or "root"
    line_number: int        # 1-indexed
    syntax_type: str        # checkbox_open | checkbox_done | bullet |
                            # numbered | bold_item | plain | url
    raw_text: str           # stripped of markdown syntax
    is_completed: bool      # True if checkbox_done or struck through
    attached_url: str       # populated if next line is a bare URL
```

Parser rules:
1. Read line by line. Track `current_section`.
2. Skip blank lines, `---`/`===` dividers, whitespace-only lines.
3. Classify each line by syntax type.
4. Strip markdown: remove `- [ ]`, `- [x]`, `- `, `N. `, `**`, `~~`, `#`. Trim.
5. URL-only lines: attach to previous record as `attached_url`, no new record.
6. Empty-after-strip lines: discard.

Anti-fragility: per-line try/except, file-level try/except. Failures log
and continue. A bad line never stops a file; a bad file never stops the run.

---

## Phase 2 — Semantic Classifier

**Input:** All `RawRecord` objects from one file plus its `FileContext`.

**Output:** A list of `ClassifiedRecord` objects.

```python
@dataclass
class ClassifiedRecord(RawRecord):
    entry_type: str     # task | idea | reminder | note | goal |
                        # shopping | reading | contact | motivational
    clean_text: str     # normalized text for storage
    confidence: float   # 0.0–1.0
```

One Claude API call per file. JSON array in, JSON array out.

System prompt:
```
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
- checkbox_open in shopping/groceries section → shopping
- bold_item in reading section → reading
- plain line starting with "I " → likely motivational
- numbered item in reading section → reading

Target 85% accuracy. When genuinely uncertain assign the most
plausible type and set confidence below 0.4.

Return ONLY the JSON array. No preamble. No markdown fences.
```

**Fallback** (API failure only):

| syntax_type | section hint | fallback type |
|-------------|--------------|---------------|
| checkbox_open | shopping/groceries | shopping |
| checkbox_open | reading | reading |
| checkbox_open | other | task |
| checkbox_done | any | task |
| numbered | reading | reading |
| numbered | other | note |
| bold_item | any | goal |
| bullet | any | reminder |
| plain | any | note |

Fallback sets `confidence: 0.3` on all records. Log activation.

---

## Phase 3 — Tag Builder

Assembles the complete tag set for each record deterministically.

```python
def build_tags(record: ClassifiedRecord, ctx: FileContext) -> list[str]:
    tags = set()
    tags.update(ctx.path_tags)
    tags.add(ctx.filename_stem)
    tags.add(record.entry_type)
    if record.confidence < 0.4:
        tags.add("unsure")
    if record.is_completed:
        tags.add("completed")
    return sorted(normalize_tag(t) for t in tags)

def normalize_tag(tag: str) -> str:
    return re.sub(r'[-_]+', ' ', tag).strip().lower()[:50]
```

---

## Phase 4 — Dedup and Validate

**Dedup key:** SHA-256 of `(source_file + "|" + str(line_number) + "|" + raw_text)`.

Hash exists in `import_hashes` → skip, log, increment `skipped_count`.

**Validation:** clean_text not empty; entry_type known; source_file not empty.
Failures logged and discarded. Import continues.

---

## Phase 5 — DB Insert

All inserts for one file in a single transaction. File-level rollback on
failure. Other files unaffected. Undo via batch_id (delete entries +
import_hashes). Exposed in UI as "Undo import."

---

## DB Schema

### New tables

```sql
CREATE TABLE import_batches (
    id            TEXT PRIMARY KEY,
    imported_at   TIMESTAMP NOT NULL,
    source_file   TEXT NOT NULL,
    root_dir      TEXT NOT NULL,
    total_lines   INT DEFAULT 0,
    imported      INT DEFAULT 0,
    skipped       INT DEFAULT 0,
    errors        INT DEFAULT 0,
    fallback_used BOOLEAN DEFAULT FALSE
);

CREATE TABLE import_hashes (
    hash        TEXT PRIMARY KEY,
    batch_id    TEXT NOT NULL REFERENCES import_batches(id),
    imported_at TIMESTAMP NOT NULL
);

CREATE TABLE tags (
    id    TEXT PRIMARY KEY,
    name  TEXT UNIQUE NOT NULL
);

CREATE TABLE entry_tags (
    entry_id  TEXT NOT NULL REFERENCES entries(id),
    tag_id    TEXT NOT NULL REFERENCES tags(id),
    PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX idx_entry_tags_tag_id ON entry_tags(tag_id);
```

### Additions to existing `entries` table

```sql
ALTER TABLE entries ADD COLUMN source_file     TEXT;
ALTER TABLE entries ADD COLUMN source_section  TEXT;
ALTER TABLE entries ADD COLUMN entry_type      TEXT;
ALTER TABLE entries ADD COLUMN syntax_type     TEXT;
ALTER TABLE entries ADD COLUMN is_completed    BOOLEAN DEFAULT FALSE;
ALTER TABLE entries ADD COLUMN confidence      REAL;
ALTER TABLE entries ADD COLUMN import_batch_id TEXT;
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Empty file | Zero records, log warning, no error |
| File with only headings | Zero records, log warning |
| Line > 500 chars | Truncate to 500, log |
| Non-UTF-8 encoding | Re-read with `errors='replace'`, log |
| `- [ ] ~~done item~~` | `is_completed: True`, strip `~~` from text |
| Embedded URL in item | Keep in clean_text, extract to `attached_url` |
| Line that is just a number | Discard |
| Same text, different sections | Both imported — dedup is by line_number |
| Directory name == filename stem | Deduplicated to one tag |
| File in root dir (no subdirs) | `path_tags` empty, filename tag still applied |

---

## Module Structure

```
src/
  importer/
    __init__.py
    walker.py         # DirectoryWalker
    parser.py         # StructuralParser — Phase 1
    classifier.py     # SemanticClassifier — Phase 2
    tagger.py         # TagBuilder — Phase 3
    dedup.py          # DedupValidator — Phase 4
    inserter.py       # BatchInserter — Phase 5
    pipeline.py       # ImportPipeline — orchestrates all phases
    report.py         # ImportReport dataclass + formatter

tests/
  importer/
    test_walker.py
    test_parser.py
    test_classifier.py
    test_tagger.py
    test_dedup.py
    test_pipeline.py
    fixtures/
      flat/
        2day-do-this.md
        Groceries.md
      nested/
        work/Work-hunt-and-Future.md
        personal/General-To-dos.md
      edge_cases/
        empty.md
        only_headings.md
        non_utf8.md
```

---

## Import Report

```
Import Report — 2026-03-12 14:30
  Root:          /home/christopher/notes/
  Files found:   6  |  processed: 6  |  failed: 0

  2day-do-this.md          imported: 31  skipped: 3  errors: 0
  Groceries.md             imported: 12  skipped: 0  errors: 0
  General-To-dos.md        imported: 18  skipped: 0  errors: 1
  General-Principles.md    imported: 14  skipped: 0  errors: 0
  To-sell.md               imported:  4  skipped: 0  errors: 0
  Work-hunt-and-Future.md  imported: 22  skipped: 0  errors: 0

  Total imported: 101  |  skipped: 3  |  errors: 1
  Needs review (unsure tag): 8
  Fallback classifier used: No

  Entry types:
    task 42 | goal 14 | shopping 13 | reading 9
    motivational 8 | reminder 7 | idea 5 | note 3
```

---

## What the Importer Does NOT Do

- Does not re-import or sync. One-time, additive only.
- Does not delete entries when source lines are removed.
- Does not resolve cross-entry references.
- Does not parse nested lists beyond one level.
- Does not infer priority (v1 — future enhancement).
- Does not watch filesystem for changes (future — design permits it).

---

*Import Pipeline Annex — Version 0.2 — March 2026*
*All design decisions resolved. Ready for Claude Code implementation.*
*Copyright 2026 Christopher Rehm. All rights reserved.*
