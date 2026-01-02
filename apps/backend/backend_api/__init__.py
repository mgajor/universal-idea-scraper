"""API package."""
import sys
from pathlib import Path

# Ensure backend directory is in path
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend_api.routes import (
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
from backend_api.auth import verify_api_key, require_auth

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
    "verify_api_key",
    "require_auth",
]

