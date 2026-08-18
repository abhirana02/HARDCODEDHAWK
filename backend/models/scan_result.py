from __future__ import annotations

from dataclasses import dataclass, field

from backend.models.finding import Finding

@dataclass(slots=True)
class Scanresult:
    """
    Stores the result returned
    by a scanner.
    """

    scanner:str
    findings:list[Finding] = field(default_factory=list)
    duration:float = 0.0
    successful:bool= True

    error:str | None=None
