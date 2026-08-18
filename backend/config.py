import os

class Settings:
    GROQ_API_KEY: str = os.environ.get(
        "GROQ_API_KEY", 
        "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"
    )
    
    # Active, stable Groq endpoints
    GROQ_MODEL_CASCADE: list = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b"
    ]

    @property
    def GROQ_MODEL(self) -> str:
        return self.GROQ_MODEL_CASCADE[0]

settings = Settings()