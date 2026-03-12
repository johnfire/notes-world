"""Import report: dataclass + text formatter."""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class FileReport:
    filename: str
    imported: int = 0
    skipped: int = 0
    errors: int = 0
    fallback_used: bool = False


@dataclass
class ImportReport:
    root_dir: str
    started_at: datetime = field(default_factory=datetime.now)
    files_found: int = 0
    files_processed: int = 0
    files_failed: int = 0
    file_reports: list[FileReport] = field(default_factory=list)

    @property
    def total_imported(self) -> int:
        return sum(f.imported for f in self.file_reports)

    @property
    def total_skipped(self) -> int:
        return sum(f.skipped for f in self.file_reports)

    @property
    def total_errors(self) -> int:
        return sum(f.errors for f in self.file_reports)

    @property
    def fallback_used(self) -> bool:
        return any(f.fallback_used for f in self.file_reports)

    def format(self) -> str:
        ts = self.started_at.strftime('%Y-%m-%d %H:%M')
        lines = [
            f'Import Report — {ts}',
            f'  Root:          {self.root_dir}',
            f'  Files found:   {self.files_found}'
            f'  |  processed: {self.files_processed}'
            f'  |  failed: {self.files_failed}',
            '',
        ]

        for fr in self.file_reports:
            lines.append(
                f'  {fr.filename:<30}  '
                f'imported: {fr.imported:>3}  '
                f'skipped: {fr.skipped:>3}  '
                f'errors: {fr.errors:>3}'
            )

        lines += [
            '',
            f'  Total imported: {self.total_imported}'
            f'  |  skipped: {self.total_skipped}'
            f'  |  errors: {self.total_errors}',
            f'  Fallback classifier used: {"Yes" if self.fallback_used else "No"}',
        ]

        return '\n'.join(lines)
