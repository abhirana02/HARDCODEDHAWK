from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(slots=True)
class Repository:
    """
    Represents a repository loaded into HardcodedHawk.
    """

    # Repository Information
    name: str
    local_path: Path
    source: str
    source_type: str
    is_temporary: bool

    # Metadata
    loaded_at: datetime

    # Repository Statistics (filled by FileProcessor)
    total_files: int = 0
    source_files: int = 0
    ignored_files: int = 0
    binary_files: int = 0
    total_size: int = 0