from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Flask
    FLASK_ENV: str = "development"
    FLASK_DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    # Database
    DATABASE_URL: str = "sqlite:///hardcodedhawk.db"

    # Storage
    UPLOAD_FOLDER: str = "backend/uploads"
    REPORT_FOLDER: str = "backend/generated_reports"

    # Groq AI Integration
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_CASCADE: list = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b"
    ]

    # Limits
    MAX_UPLOAD_SIZE: int = 104857600

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()