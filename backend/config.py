from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "94e77353f8a00223708e1a6624f2b1c8f1a1d1d1f1f1f1f1f1f1f1"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"

settings = Settings()
