from backend.services.repository_loader import RepositoryLoader
from backend.services.file_processor import FileProcessor


loader = RepositoryLoader()

repository = loader.load(
    r"D:\HARDCODEDHAWK"
)

processor = FileProcessor()

files = processor.process(repository)

print(f"\nFiles Found: {len(files)}\n")

for file in files[:10]:
    print(
        file.relative_path,
        file.language,
        file.size,
    )