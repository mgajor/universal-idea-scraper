"""
Reddit Ops Console - FastAPI Backend
Main application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys
import os

# Load .env file FIRST so os.getenv() works in all modules
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Add backend directory to path FIRST (for our renamed packages)
# Then add project root for scraper access
backend_dir = Path(__file__).parent
project_root = backend_dir.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(1, str(project_root))

from backend_config import get_settings
from backend_db import init_db, close_db
from backend_core import job_queue
from backend_api import (
    jobs_router,
    runs_router,
    data_router,
    analytics_router,
    exports_router,
    plugins_router,
    discovery_router,
    collections_router,
    digest_router,
)
from backend_api.routes.runs import notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown handlers."""
    # Startup
    settings = get_settings()
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    
    # Initialize database
    await init_db()
    print("✅ Database initialized")
    
    # Start job queue
    await job_queue.start()
    print("✅ Job queue started")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    await job_queue.stop()
    await close_db()
    print("👋 Goodbye!")


# Create FastAPI app
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Premium Reddit scraping console with job orchestration, live progress, analytics, and more.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware - uses CORS_ORIGINS from environment
# For production: set CORS_ORIGINS env var to your frontend domain(s)
cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)

# Include routers with optional authentication
# Auth is controlled by AUTH_ENABLED env var (default: false for local dev)
from backend_api.auth import require_auth

app.include_router(jobs_router, dependencies=[require_auth])
app.include_router(runs_router, dependencies=[require_auth])
app.include_router(data_router, dependencies=[require_auth])
app.include_router(analytics_router, dependencies=[require_auth])
app.include_router(exports_router, dependencies=[require_auth])
app.include_router(plugins_router, dependencies=[require_auth])
app.include_router(discovery_router, dependencies=[require_auth])
app.include_router(collections_router, dependencies=[require_auth])
app.include_router(digest_router, dependencies=[require_auth])
app.include_router(notifications_router)  # Keep notifications open for WebSocket


# --- Root Endpoints ---

@app.get("/", tags=["Info"])
async def root():
    """API root - basic info."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "endpoints": [
            "/jobs",
            "/runs",
            "/posts",
            "/comments",
            "/search",
            "/analytics",
            "/exports",
            "/plugins",
        ],
    }


@app.get("/health", tags=["Info"])
async def health_check():
    """Health check endpoint with detailed diagnostics."""
    from backend_db import get_session_context
    from sqlalchemy import text
    from datetime import datetime
    import time
    
    result = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": settings.app_version,
        "database": {
            "status": "unknown",
            "latency_ms": None,
        },
        "queue": {
            "running": job_queue.get_running_count(),
            "queued": job_queue.get_queue_size(),
        },
    }
    
    # Check database connectivity and measure latency
    try:
        start = time.time()
        async with get_session_context() as session:
            await session.execute(text("SELECT 1"))
        latency_ms = round((time.time() - start) * 1000, 2)
        
        result["database"]["status"] = "connected"
        result["database"]["latency_ms"] = latency_ms
        
        # Warn if database is slow
        if latency_ms > 100:
            result["status"] = "degraded"
            result["database"]["warning"] = "High latency detected"
            
    except Exception as e:
        result["status"] = "unhealthy"
        result["database"]["status"] = "error"
        result["database"]["error"] = str(e)
    
    return result


@app.get("/stats/overview", tags=["Info"])
async def stats_overview():
    """Get overall system stats."""
    from backend_db import get_session_context, Job, JobRun, Post, Comment
    from sqlalchemy import select, func
    
    async with get_session_context() as session:
        # Counts
        jobs_count = await session.execute(select(func.count()).select_from(Job))
        runs_count = await session.execute(select(func.count()).select_from(JobRun))
        posts_count = await session.execute(select(func.count()).select_from(Post))
        comments_count = await session.execute(select(func.count()).select_from(Comment))
        
        return {
            "jobs": jobs_count.scalar() or 0,
            "runs": runs_count.scalar() or 0,
            "posts": posts_count.scalar() or 0,
            "comments": comments_count.scalar() or 0,
            "queue": {
                "running": job_queue.get_running_count(),
                "queued": job_queue.get_queue_size(),
            },
        }


# --- CLI Entry Point ---

def main():
    """Run the server using uvicorn."""
    import uvicorn
    
    settings = get_settings()
    
    print("=" * 50)
    print(f"🤖 {settings.app_name}")
    print("=" * 50)
    print(f"📖 Docs: http://localhost:{settings.port}/docs")
    print(f"🔌 API:  http://localhost:{settings.port}")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()
