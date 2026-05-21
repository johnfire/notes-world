"""ImportPipeline — orchestrates all 5 phases."""

import os
from typing import Any

from .classifier import SemanticClassifier
from .dedup import DedupValidator
from .inserter import BatchInserter
from .parser import StructuralParser
from .report import FileReport, ImportReport
from .walker import DirectoryWalker


def _get_db_connection() -> Any:
    import psycopg2  # noqa: PLC0415 — lazy import so tests can run without psycopg2
    return psycopg2.connect(
        host=os.environ.get('POSTGRES_HOST', 'localhost'),
        port=int(os.environ.get('POSTGRES_PORT', '5432')),
        dbname=os.environ.get('POSTGRES_DB', 'notes_world'),
        user=os.environ.get('POSTGRES_USER', 'notes_world'),
        password=os.environ.get('POSTGRES_PASSWORD', 'changeme'),
    )


class ImportPipeline:

    def __init__(self, user_id: str | None = None, conn: Any = None) -> None:
        self.user_id = user_id or os.environ.get(
            'PHASE1_USER_ID', '00000000-0000-0000-0000-000000000001'
        )
        self._conn = conn  # injectable for testing

    def run(self, root_dir: str) -> ImportReport:
        root_dir = os.path.abspath(root_dir)
        report = ImportReport(root_dir=root_dir)

        conn = self._conn or _get_db_connection()
        own_conn = self._conn is None

        try:
            walker = DirectoryWalker()
            parser = StructuralParser()
            classifier = SemanticClassifier()
            dedup = DedupValidator(conn)
            inserter = BatchInserter(conn, self.user_id)

            file_contexts = list(walker.walk(root_dir))
            report.files_found = len(file_contexts)

            for ctx in file_contexts:
                fr = FileReport(filename=ctx.filename)
                try:
                    with open(ctx.abs_path, encoding='utf-8', errors='replace') as fh:
                        content = fh.read()

                    if not content.strip():
                        print(f'WARNING: Empty file: {ctx.filename}')
                        report.file_reports.append(fr)
                        report.files_processed += 1
                        continue

                    # Phase 1
                    raw_records = parser.parse(ctx, content)
                    if not raw_records:
                        print(f'WARNING: No records found in: {ctx.filename}')
                        report.file_reports.append(fr)
                        report.files_processed += 1
                        continue

                    # Phase 2
                    classified, fallback_used = classifier.classify(raw_records, ctx)
                    fr.fallback_used = fallback_used

                    # Phase 4
                    to_import, skipped = dedup.filter(classified)
                    fr.skipped = len(skipped)

                    if not to_import:
                        report.file_reports.append(fr)
                        report.files_processed += 1
                        continue

                    # Phase 5
                    batch_id = inserter.create_batch(ctx.filename, root_dir)
                    imported, errors = inserter.insert_batch(batch_id, to_import, ctx)
                    inserter.update_batch(
                        batch_id,
                        total_lines=len(raw_records),
                        imported=imported,
                        skipped=len(skipped),
                        errors=errors,
                        fallback_used=fallback_used,
                    )

                    fr.imported = imported
                    fr.errors = errors
                    report.files_processed += 1

                except Exception as e:  # noqa: BLE001
                    print(f'ERROR: Failed to process {ctx.filename}: {e}')
                    fr.errors = 1
                    report.files_failed += 1

                report.file_reports.append(fr)

        finally:
            if own_conn:
                conn.close()

        return report
