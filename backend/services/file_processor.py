from __future__ import annotations
from datetime import datetime
from pathlib import Path

from backend.models.repository import Repository
from backend.models.source_file import SourceFile

from backend.utils.constants import(
    IGNORED_DIRECTORIES,
    IGNORED_FILES ,
    SUPPORTED_EXTENSIONS,
)


from backend.utils.file_detector import is_binary_file
from backend.utils.encoding_detector import detect_encoding
from backend.utils.file_utils import calculate_sha256
from backend.utils.language_detector import detect_language

class FileProcessor:
    """
    Discovers supported source files
    inside a repository
    """

    def process(
            self,
            repository:Repository,
    ) -> list[SourceFile]:
        source_files:list[SourceFile]=[]

        for path in repository.local_path.rglob("*"):
            if not path.is_file():
                continue
            if path.name in IGNORED_FILES:
                continue

            if any(
                part in IGNORED_DIRECTORIES
                for part in path.parts
            ):
                continue

            if( 
                path.suffix.lower()
                not in SUPPORTED_EXTENSIONS
            ):
                continue
                                    
            binary=is_binary_file(path)

            encoding=(
                "binary"
                if binary
                else detect_encoding(path)
            )

            stat=path.stat()
            source_files.append(
                SourceFile(
                    name=path.name,
                    extension=path.suffix.lower(),
                    language=detect_language(path),

                    absolute_path=path,
                    relative_path=path.relative_to(repository.local_path),

                    size=stat.st_size,
                    sha256=calculate_sha256(path),
                    encoding=encoding,

                    is_binary=binary,
                    is_hidden=path.name.startswith("."),

                    created_at=datetime.fromtimestamp(stat.st_ctime),
                    modified_at=datetime.fromtimestamp(stat.st_mtime)     
                    ),
             
            )
        return source_files