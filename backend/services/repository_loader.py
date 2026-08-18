from pathlib import Path
from datetime import datetime, UTC

from backend.models.repository import Repository

class RepositoryLoader:
    """
    Loads local Git repositories.
    """

    def load(self,repository_path:str) -> Repository:
        """
        Loads and validate a local repository
        """

        path=Path(repository_path).expanduser().resolve()

        if not path.exists():
            raise FileNotFoundError(
                f"Repository not found: {path}"
            )
        if not path.is_dir():
            raise ValueError(
                "Provided path is not a directory"
            )

        git_directory=path / ".git"

        if not git_directory.exists():
            raise ValueError(
                "Selected directory is not git repository"
            )
        return Repository(
            name=path.name,
            local_path=path,
            source=repository_path,
            source_type="local",
            is_temporary=False,
            loaded_at=datetime.utcnow(),

            # These values will be populated later by FileProcessor
            total_files=0,
            source_files=0,
            ignored_files=0,
            binary_files=0,
            total_size=0,
        )