"""API routes package."""
import sys
from pathlib import Path

# Ensure backend directory is in path
backend_dir = Path(__file__).parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend_api.routes.jobs import router as jobs_router
from backend_api.routes.runs import router as runs_router
from backend_api.routes.data import router as data_router
from backend_api.routes.analytics import router as analytics_router
from backend_api.routes.exports import router as exports_router
from backend_api.routes.plugins import router as plugins_router
from backend_api.routes.discovery import router as discovery_router
from backend_api.routes.collections import router as collections_router
from backend_api.routes.digest import router as digest_router

__all__ = [
    "jobs_router",
    "runs_router",
    "data_router",
    "analytics_router",
    "exports_router",
    "plugins_router",
    "discovery_router",
    "collections_router",
    "digest_router",
]


