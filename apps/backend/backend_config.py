"""
Reddit Ops Console - Backend Configuration
"""
from pydantic_settings import BaseSettings
from pathlib import Path
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # App info
    app_name: str = "Reddit Ops Console"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./data/reddit_ops.db"
    
    # Paths
    data_dir: Path = Path("./data")
    exports_dir: Path = Path("./data/exports")
    
    # Auth (optional)
    auth_enabled: bool = False
    auth_password: str = "changeme"
    
    # Scraper settings
    max_concurrent_jobs: int = 3
    default_scrape_limit: int = 100
    
    # WebSocket
    ws_heartbeat_interval: int = 30
    
    # CORS - comma-separated list of allowed origins
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # External API Keys (Problem Discovery)
    apify_api_token: str = ""
    openrouter_api_key: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore any extra env vars


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
