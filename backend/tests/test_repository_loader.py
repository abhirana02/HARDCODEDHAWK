from backend.services.repository_loader import RepositoryLoader
loader = RepositoryLoader()

repo = loader.load(
    r"D:\HARDCODEDHAWK"
)

print(repo)