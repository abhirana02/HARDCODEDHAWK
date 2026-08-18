from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(slots=True)
class SourceFile:
    """
    Represents a source file that is eligible
    for security analysis.
    """

    # Basic Information
    name: str
    extension: str
    language: str

    # Paths
    absolute_path: Path
    relative_path: Path

    # Metadata
    size: int
    sha256: str
    encoding: str

    # File Attributes
    is_binary: bool
    is_hidden: bool

    # Timestamps
    created_at: datetime
    modified_at: datetime