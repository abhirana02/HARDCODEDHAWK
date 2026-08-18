from __future__ import annotations

from backend.models.repository import Repository
from backend.models.scan_result import Scanresult
from backend.models.source_file import SourceFile

from backend.scanners.base.base_scanner import BaseScanner

class ScannerManager:
    """
    Executes all registered Scanners.
    """

    def __init__(self) -> None:

        self._scanners: list[BaseScanner] = []

    def register(
        self,
        scanner: BaseScanner,
    ) -> None:

        self._scanners.append(scanner)

    def scan(
        self,
        repository: Repository,
        files: list[SourceFile],
    ) -> list[Scanresult]:
        results:list[Scanresult] = []

        for scanner in self._scanners:

            try:
                results.append(
                    scanner.scan(
                        repository,
                        files,
                    )
                )
            except Exception as error:
                results.append(
                    Scanresult(
                        scanner=scanner.name,
                        successful=False,
                        error=str(error),
                    )
                )
        return results