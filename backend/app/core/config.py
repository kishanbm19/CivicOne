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

    # Password-reset email delivery settings (all optional; reset flow degrades
    # safely when not configured).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@civicone.gov"
    SMTP_TLS: bool = True
    FRONTEND_URL: str = "http://localhost:5173"

    # Maximum password-reset requests per IP per window (simple DB-backed counter).
    PASSWORD_RESET_RATE_LIMIT: int = 100
    PASSWORD_RESET_RATE_WINDOW_MINUTES: int = 1
    # Token validity window in minutes.
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 20

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            # Clean accidental placeholder brackets like :<password>@ -> :password@
            v = re.sub(r':<([^>]+)>@', r':\1@', v)
        return v

settings = Settings()
