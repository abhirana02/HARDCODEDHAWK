from __future__ import annotations

import time
from pathlib import Path

from backend.models.finding import Finding
from backend.models.repository import Repository
from backend.models.scan_result import ScanResult
from backend.models.source_file import SourceFile
from backend.models.rule import Rule

from backend.scanners.base.base_scanner import BaseScanner
from backend.services.rule_loader import RuleLoader


class RegexScanner(BaseScanner):
    """
    Detects hardcoded secrets using
    predefined regular-expression rules.
    """

    name = "Regex Scanner"

    def __init__(
        self,
        rule_loader: RuleLoader,
    ) -> None:

        self._rules = rule_loader.load()

    def scan(
        self,
        repository: Repository,
        files: list[SourceFile],
    ) -> ScanResult:

        start = time.perf_counter()

        findings: list[Finding] = []

        for source_file in files:

            if source_file.is_binary:
                continue

            content = self._read_file(
                source_file.absolute_path,
                source_file.encoding,
            )

            if content is None:
                continue

            findings.extend(

                self._scan_content(
                    source_file,
                    content,
                )

            )

        duration = time.perf_counter() - start

        return ScanResult(

            scanner=self.name,

            findings=findings,

            duration=duration,

            successful=True,

        )

    def _read_file(
        self,
        path: Path,
        encoding: str,
    ) -> str | None:

        try:

            with path.open(
                "r",
                encoding=encoding,
                errors="ignore",
            ) as file:

                return file.read()

        except Exception:

            return None

    def _scan_content(
        self,
        source_file: SourceFile,
        content: str,
    ) -> list[Finding]:

        findings: list[Finding] = []

        for rule in self._rules:

            for match in rule.compiled_pattern.finditer(content):

                line = content.count(
                    "\n",
                    0,
                    match.start(),
                ) + 1

                findings.append(

                    Finding(

                        scanner=self.name,

                        rule_id=rule.id,

                        title=rule.name,

                        description=rule.description,

                        severity=rule.severity,

                        file=source_file.relative_path,

                        line=line,

                        column=None,

                        evidence=match.group(0),

                        recommendation=rule.recommendation,

                    )

                )

        return findings