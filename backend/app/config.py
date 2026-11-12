import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicEye - AI Road Damage & Civic Reporting API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./civiceye.db")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Duplicate detection defaults
    DUPLICATE_RADIUS_METERS: float = float(os.getenv("DUPLICATE_RADIUS_METERS", "50.0"))
    DUPLICATE_TIME_WINDOW_DAYS: int = int(os.getenv("DUPLICATE_TIME_WINDOW_DAYS", "30"))
    
    # AI model configuration
    AI_MODEL_WEIGHTS_PATH: str = os.getenv("AI_MODEL_WEIGHTS_PATH", "./weights/pothole_yolov8.pt")
    ENABLE_REAL_AI: bool = os.getenv("ENABLE_REAL_AI", "false").lower() in ("true", "1")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civiceye-hackathon-secure-secret-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
