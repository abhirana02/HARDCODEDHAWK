from __future__ import annotations

import json
import re
from pathlib import Path

from backend.models.rule import Rule


class RuleLoader:
    """
    Loads and compiles secret detection rules.
    """

    def __init__(self, rules_path: Path) -> None:
        self._rules_path = rules_path
        self._rules: list[Rule] | None = None

    def load(self) -> list[Rule]:
        """
        Load rules from disk only once.
        """

        if self._rules is not None:
            return self._rules

        with self._rules_path.open(
            "r",
            encoding="utf-8",
        ) as file:
            raw_rules = json.load(file)

        rules: list[Rule] = []

        for item in raw_rules:

            rule = Rule(
                id=item["id"],
                name=item["name"],
                description=item["description"],
                category=item["category"],
                severity=item["severity"],
                confidence=item["confidence"],
                pattern=item["pattern"],
                compiled_pattern=re.compile(item["pattern"]),
                recommendation=item["recommendation"],
                references=item["references"],
            )

            rules.append(rule)

        self._rules = rules

        return rules