from pathlib import Path

def is_binary_file(path:Path) -> bool:
    """
    check whether a file is binary.

    the function reads only the first 1024 bytes,
    making it fast even for large files.
    """

    try:
        with path.open("rb") as file:
            chunk=file.read(1024)
        return b"\x00" in chunk
    except OSError:
        return True