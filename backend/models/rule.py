from __future__ import annotations

from dataclasses import dataclass
from re import Pattern


@dataclass(slots=True)
class Rule:
    """
    Represents a compiled secret detection rule.
    """

    id: str
    name: str
    description: str

    category: str
    severity: str
    confidence: int

    pattern: str
    compiled_pattern: Pattern[str]

    recommendation: str

    references: list[str]