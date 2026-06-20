# Architectural Annex — Export Pipeline
## Notes App — Export Subsystem

*Version 0.1 — March 2026*
*Status: Implemented*
*Companion to: main app architecture, annex-import-pipeline.md*

---

## Overview

The export subsystem converts items and their organizational structure
(tags, dividers, colors) into downloadable markdown documents. It is
the inverse of the import pipeline — exported files can be re-imported
to recreate items and tag associations.

## Export Modes

| Mode | Endpoint | Output | Use Case |
|------|----------|--------|----------|
| Per-tag | `GET /api/export/tag/:tagId` | Single `.md` file | Export one tag's contents |
| Untagged | `GET /api/export/untagged` | Single `.md` file | Export items with no tags |
| Full | `GET /api/export/all` | `.zip` archive | Backup entire database |

## Markdown Format

Each exported file follows a consistent structure:

```markdown
# Tag Name

- Item title (type metadata) <!-- color: #hex -->
  Body text indented two spaces

## Divider Label <!-- color: #hex -->

- [ ] Task item (Open, High priority, due 2026-03-20)

---

- Item under unlabelled divider
```

### Type-Specific Formatting

| Item Type | Format |
|-----------|--------|
| Task | `- [x]` or `- [ ]` checkbox, status, priority (if not Normal), due date |
| Idea | `- title (maturity)` |
| Reminder | `- title (remind: date)` |
| Note/Untyped | `- title` |

### Divider Formatting

| Divider State | Output |
|---------------|--------|
| With label | `## Label Text` |
| Without label | `---` |
| With color | Appends `<!-- color: #hex -->` |

### Color Metadata

Colors are preserved as HTML comments appended to the item or divider
line. This format is invisible when rendered as markdown but can be
parsed on re-import. Example: `<!-- color: #ef4444 -->`

## Full Export (Zip Archive)

The `/api/export/all` endpoint produces a zip archive using the
`archiver` library (zlib level 9 compression). The archive contains:

- One `.md` file per tag, named with the sanitized tag name
- `untagged.md` if untagged items exist
- Tags with zero items are excluded

The zip filename includes the export date:
`notes-world-export-2026-03-16.zip`

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  ActionBar   │────▶│  export.routes   │────▶│ export.ctrl  │
│  (Export     │     │                  │     │              │
│   button)    │     │  GET /all        │     │  exportAll   │
│              │     │  GET /tag/:id    │     │  exportTag   │
│  TagView     │     │  GET /untagged   │     │  exportUntag │
│  (Export     │     └─────────────────┘     └──────┬───────┘
│   button)    │                                     │
└──────────────┘                                     ▼
                                            ┌──────────────┐
                                            │ export.svc   │
                                            │              │
                                            │ formatItem() │
                                            │ formatDiv()  │
                                            │ toMarkdown() │
                                            └──────┬───────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                             items.repo     rel.repo       archiver
                             (findByTag)    (findAllTags)   (zip)
                             (findUntag)    (findTagById)
```

## Dependencies

- `archiver` (npm) — zip archive creation for full export
- Standard `stream.PassThrough` for streaming zip to HTTP response

## UI Integration

| Location | Control | Action |
|----------|---------|--------|
| ActionBar (top header) | "Export" button | Triggers full export (`/api/export/all`) |
| TagView header | "Export" text button | Exports current tag (`/api/export/tag/:id`) |

## Design Decisions

### Why HTML Comments for Color Metadata

HTML comments are invisible in standard markdown renderers, so the
exported files remain clean and readable. The format is simple to
parse (`<!-- color: #hex -->`) if re-import with color support is
added later. Alternative approaches (YAML frontmatter, custom syntax)
would either complicate the format or require custom renderers.

### Why Zip for Full Export

A zip archive is the most portable container format. Each tag maps to
one file, matching the import pipeline's single-file-per-tag model.
Users can selectively re-import individual files from the archive.

### Why Not Include Sort Order or Collapse State

Sort order and collapse state are UI-specific preferences stored in
the `item_sort_orders` table. They are not part of the content and
would add complexity to the export format without clear value. These
preferences are automatically reconstructed when items are re-imported
and the user re-arranges them.
