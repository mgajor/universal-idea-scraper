"""Core package - Job runner, queue, and WebSocket management."""
import sys
from pathlib import Path

# Ensure backend directory is in path
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(project_root) not in sys.path:
    sys.path.insert(1, str(project_root))

from backend_core.job_runner import job_runner, JobRunner, JobEvent, EventType
from backend_core.websocket import ws_manager, WebSocketManager
from backend_core.queue import job_queue, JobQueue

__all__ = [
    "job_runner",
    "JobRunner",
    "JobEvent",
    "EventType",
    "ws_manager",
    "WebSocketManager",
    "job_queue",
    "JobQueue",
]
