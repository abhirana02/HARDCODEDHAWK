from __future__ import annotations

from abc import ABC,abstractmethod

from backend.models.repository import Repository
from backend.models.scan_result import Scanresult
from backend.models.source_file import SourceFile

class BaseScanner(ABC):
    """
    Base Class for all scanners
    """

    name:str
    @abstractmethod
    def scan(
        self,
        respository:Repository,
        files:list[SourceFile],

    ) -> Scanresult:
        """
        run Scanner
        """

        raise NotImplementedError