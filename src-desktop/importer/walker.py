"""Phase 0 — Directory Walker: find all .md files recursively, extract path tags."""

import os
import re
from dataclasses import dataclass, field
from typing import Iterator


def normalize_tag(tag: str) -> str:
    return re.sub(r'[-_]+', ' ', tag).strip().lower()[:50]


@dataclass
class FileContext:
    abs_path: str           # full path to file
    filename: str           # e.g. "Groceries.md"
    filename_stem: str      # e.g. "groceries" (lowercased, normalized)
    path_tags: list[str]    # directory components as normalized tags
                            # root dir excluded; e.g. ["notes", "shopping"]


class DirectoryWalker:
    MAX_FILE_SIZE = 1_000_000  # 1 MB

    def walk(self, root_dir: str) -> Iterator[FileContext]:
        root_dir = os.path.abspath(root_dir)

        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Skip hidden directories (mutate in place to prevent descent)
            dirnames[:] = sorted(d for d in dirnames if not d.startswith('.'))

            for filename in sorted(filenames):
                if filename.startswith('.'):
                    continue
                if not filename.lower().endswith('.md'):
                    continue

                abs_path = os.path.join(dirpath, filename)

                try:
                    size = os.path.getsize(abs_path)
                except OSError:
                    continue

                if size > self.MAX_FILE_SIZE:
                    print(f'WARNING: Skipping {abs_path} ({size} bytes > 1 MB)')
                    continue

                rel_dir = os.path.relpath(dirpath, root_dir)
                path_tags: list[str] = []
                if rel_dir != '.':
                    path_tags = [
                        normalize_tag(p)
                        for p in rel_dir.split(os.sep)
                        if p and not p.startswith('.')
                    ]

                stem = normalize_tag(os.path.splitext(filename)[0])

                yield FileContext(
                    abs_path=abs_path,
                    filename=filename,
                    filename_stem=stem,
                    path_tags=path_tags,
                )
