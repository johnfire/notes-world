#!/usr/bin/env python3
"""CLI entry point: python -m importer <directory>"""

import os
import sys
from pathlib import Path


def _load_env() -> None:
    env_path = Path(__file__).resolve().parent.parent.parent / '.env'
    if not env_path.exists():
        return
    with open(env_path) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            os.environ.setdefault(key.strip(), value.strip())


def main() -> None:
    _load_env()

    if len(sys.argv) < 2:
        print('Usage: python -m importer <directory>', file=sys.stderr)
        sys.exit(1)

    root_dir = sys.argv[1]
    if not os.path.isdir(root_dir):
        print(f'Error: not a directory: {root_dir}', file=sys.stderr)
        sys.exit(1)

    from .pipeline import ImportPipeline
    pipeline = ImportPipeline()
    report = pipeline.run(root_dir)
    print(report.format())


if __name__ == '__main__':
    main()
