from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import os
from pathlib import Path

from backend_db.models import Base
from backend_config import get_settings


# Global engine and session factory
_engine = None
_session_factory = None


async def init_db():
    """Initialize database - create engine and tables."""
    global _engine, _session_factory
    
    settings = get_settings()
    
    # Ensure data directory exists (for SQLite)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.exports_dir.mkdir(parents=True, exist_ok=True)
    
    # Determine if using SQLite or PostgreSQL
    is_sqlite = "sqlite" in settings.database_url
    
    # Create async engine with appropriate settings
    engine_kwargs = {
        "echo": settings.debug,
    }
    
    if is_sqlite:
        # SQLite specific settings
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        engine_kwargs["poolclass"] = StaticPool
    else:
        # PostgreSQL settings for asyncpg with PROPER connection pooling
        # Use AsyncAdaptedQueuePool (default) with health checks and limits
        engine_kwargs["pool_size"] = 5  # Concurrent connections in pool
        engine_kwargs["max_overflow"] = 10  # Extra connections allowed during burst
        engine_kwargs["pool_recycle"] = 300  # Recreate connections after 5 min (prevents stale)
        engine_kwargs["pool_pre_ping"] = True  # Validate connections before use (critical!)
        engine_kwargs["pool_timeout"] = 10  # Fail fast if no connection available in 10s
        
        # Asyncpg-specific connection args
        engine_kwargs["connect_args"] = {
            "statement_cache_size": 0,  # Disable statement caching to prevent issues
            "command_timeout": 30,  # 30s max per SQL command
        }
    
    _engine = create_async_engine(settings.database_url, **engine_kwargs)
    
    # Create session factory
    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    
    # Create all tables
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    return _engine


async def close_db():
    """Close database connection."""
    global _engine
    if _engine:
        await _engine.dispose()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session (FastAPI dependency)."""
    global _session_factory
    
    if _session_factory is None:
        await init_db()
    
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_session_context() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session (context manager for non-FastAPI use)."""
    global _session_factory
    
    if _session_factory is None:
        await init_db()
    
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
