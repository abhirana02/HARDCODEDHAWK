from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class Finding:
    """
    Represents a single security finding.
    """

    scanner: str

    rule_id: str

    title: str

    description: str

    severity: str

    file: Path

    line: int | None

    column: int | None

    evidence: str | None

    recommendation: str | None