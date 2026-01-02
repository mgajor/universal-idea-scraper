"""Database package."""
import sys
from pathlib import Path

# Ensure backend directory is in path
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend_db.database import init_db, close_db, get_session, get_session_context
from backend_db.models import Base, Job, JobRun, JobLog, Post, Comment, Export, PluginConfig, JobStatus, JobMode
from backend_db.discovery_models import SearchJob, DiscoveredProblem, ProblemInsight, SearchStatus
from backend_db.digest_models import DigestSettings

__all__ = [
    "init_db",
    "close_db", 
    "get_session",
    "get_session_context",
    "Base",
    "Job",
    "JobRun",
    "JobLog",
    "Post",
    "Comment",
    "Export",
    "PluginConfig",
    "JobStatus",
    "JobMode",
    # Discovery models
    "SearchJob",
    "DiscoveredProblem",
    "ProblemInsight",
    "SearchStatus",
    # Digest models
    "DigestSettings",
]


