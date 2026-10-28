from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import re

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./dev.db"
    JWT_SECRET_KEY: str = "civicone-production-grade-hmac-sha256-key-32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    FRONTEND_ORIGINS: str = "http://localhost:5173"
    OPENAI_API_KEY: str = ""
    UPLOAD_DIRECTORY: str = "../storage"
    MAX_UPLOAD_SIZE_MB: int = 5

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            # Clean accidental placeholder brackets like :<password>@ -> :password@
            v = re.sub(r':<([^>]+)>@', r':\1@', v)
        return v

settings = Settings()
