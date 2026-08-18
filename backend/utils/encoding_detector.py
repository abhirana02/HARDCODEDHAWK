from pathlib import Path

SUPPORTED_ENCODINGS = (
    "utf-8",
    "utf-16",
    "latin-1",
    "ascii",
)

def detect_encoding(path:Path) -> str:
    """
    Detect Text encoding.
    Returns the first encoding,
    that sucessfully reads the file.
    """

    for encoding in SUPPORTED_ENCODINGS:
        try:
            with path.open(
                "r",
                encoding=encoding,
            )as file: 
                file.read(1024)
            return encoding
        
        except Exception:
            continue
    return "Unknown"       