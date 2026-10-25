from pydantic_settings import BaseSettings, SettingsConfigDict

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

settings = Settings()
