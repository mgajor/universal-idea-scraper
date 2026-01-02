import asyncio
from datetime import datetime
from typing import Dict, Optional, List, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
import uuid

from backend_db import JobRun, JobStatus, get_session_context
from backend_core.job_runner import job_runner, JobEvent, EventType
from backend_core.websocket import ws_manager


@dataclass
class QueuedJob:
    """A job waiting in the queue."""
    run_id: str
    job_id: str
    target: str
    mode: str
    limit: int
    is_user: bool
    download_media: bool
    scrape_comments: bool
    use_plugins: bool
    priority: int = 0
    queued_at: datetime = field(default_factory=datetime.now)


class JobQueue:
    """
    Async job queue for managing scraping jobs.
    
    Features:
    - Configurable max concurrent jobs
    - Priority queue
    - Job cancellation
    - Real-time event streaming via WebSocket
    """
    
    def __init__(self, max_concurrent: int = 3):
        self.max_concurrent = max_concurrent
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._running: Dict[str, asyncio.Task] = {}  # run_id -> task
        self._worker_task: Optional[asyncio.Task] = None
        self._shutdown = False
    
    async def start(self):
        """Start the job queue worker."""
        if self._worker_task is not None:
            return
        
        self._shutdown = False
        self._worker_task = asyncio.create_task(self._worker_loop())
    
    async def stop(self):
        """Stop the job queue worker."""
        self._shutdown = True
        
        # Cancel all running jobs
        for run_id, task in self._running.items():
            job_runner.cancel(run_id)
            task.cancel()
        
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
    
    async def enqueue(
        self,
        job_id: str,
        target: str,
        mode: str = "full",
        limit: int = 100,
        is_user: bool = False,
        download_media: bool = True,
        scrape_comments: bool = True,
        use_plugins: bool = False,
        priority: int = 0,
    ) -> str:
        """
        Add a job to the queue.
        
        Returns the run_id for tracking.
        """
        run_id = str(uuid.uuid4())
        
        queued_job = QueuedJob(
            run_id=run_id,
            job_id=job_id,
            target=target,
            mode=mode,
            limit=limit,
            is_user=is_user,
            download_media=download_media,
            scrape_comments=scrape_comments,
            use_plugins=use_plugins,
            priority=priority,
        )
        
        # Create run record in database
        async with get_session_context() as session:
            run = JobRun(
                id=run_id,
                job_id=job_id,
                status=JobStatus.PENDING.value,
            )
            session.add(run)
            await session.commit()
        
        # Add to queue (negative priority for max-heap behavior)
        await self._queue.put((-priority, queued_job.queued_at, queued_job))
        
        return run_id
    
    async def cancel(self, run_id: str) -> bool:
        """Cancel a running or queued job."""
        if run_id in self._running:
            job_runner.cancel(run_id)
            self._running[run_id].cancel()
            return True
        
        # TODO: Remove from queue if pending
        return False
    
    def get_running_count(self) -> int:
        """Get number of currently running jobs."""
        return len(self._running)
    
    def get_queue_size(self) -> int:
        """Get number of jobs waiting in queue."""
        return self._queue.qsize()
    
    async def _worker_loop(self):
        """Main worker loop - processes jobs from queue."""
        while not self._shutdown:
            try:
                # Wait for slot to open
                while len(self._running) >= self.max_concurrent:
                    await asyncio.sleep(0.5)
                    # Clean up completed tasks
                    await self._cleanup_completed()
                
                # Get next job from queue (with timeout to check shutdown)
                try:
                    _, _, queued_job = await asyncio.wait_for(
                        self._queue.get(),
                        timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # Start job execution
                task = asyncio.create_task(
                    self._execute_job(queued_job)
                )
                self._running[queued_job.run_id] = task
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                # Log error but keep worker running
                print(f"Queue worker error: {e}")
                await asyncio.sleep(1)
    
    async def _cleanup_completed(self):
        """Remove completed tasks from running dict."""
        completed = [
            run_id for run_id, task in self._running.items()
            if task.done()
        ]
        for run_id in completed:
            del self._running[run_id]
    
    async def _execute_job(self, queued_job: QueuedJob):
        """Execute a single job and stream events."""
        run_id = queued_job.run_id
        
        try:
            # Update status to running
            async with get_session_context() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(JobRun).where(JobRun.id == run_id)
                )
                run = result.scalar_one_or_none()
                if run:
                    run.status = JobStatus.RUNNING.value
                    run.started_at = datetime.now()
                    await session.commit()
            
            # Execute job and stream events
            async for event in job_runner.run(
                run_id=run_id,
                target=queued_job.target,
                mode=queued_job.mode,
                limit=queued_job.limit,
                is_user=queued_job.is_user,
                download_media=queued_job.download_media,
                scrape_comments=queued_job.scrape_comments,
                use_plugins=queued_job.use_plugins,
            ):
                # Broadcast event to WebSocket clients
                await ws_manager.broadcast(run_id, event.to_dict())
                
                # Update database on significant events
                if event.type in (EventType.COMPLETED, EventType.FAILED, EventType.CANCELLED):
                    async with get_session_context() as session:
                        result = await session.execute(
                            select(JobRun).where(JobRun.id == run_id)
                        )
                        run = result.scalar_one_or_none()
                        if run:
                            if event.type == EventType.COMPLETED:
                                run.status = JobStatus.COMPLETED.value
                            elif event.type == EventType.FAILED:
                                run.status = JobStatus.FAILED.value
                                run.error_message = event.data.get("error", "")
                            elif event.type == EventType.CANCELLED:
                                run.status = JobStatus.CANCELLED.value
                            
                            run.completed_at = datetime.now()
                            run.duration_seconds = event.data.get("duration_seconds", 0)
                            run.posts_scraped = event.data.get("posts_scraped", 0)
                            run.comments_scraped = event.data.get("comments_scraped", 0)
                            run.media_downloaded = event.data.get("media_downloaded", 0)
                            await session.commit()
                    
                    # Broadcast global notification to all connected clients
                    notification_type = {
                        EventType.COMPLETED: "job_completed",
                        EventType.FAILED: "job_failed",
                        EventType.CANCELLED: "job_cancelled",
                    }.get(event.type, "job_update")
                    
                    await ws_manager.broadcast_global({
                        "type": notification_type,
                        "job_id": queued_job.job_id,
                        "run_id": run_id,
                        "target": queued_job.target,
                        "status": run.status if run else "unknown",
                        "posts_scraped": event.data.get("posts_scraped", 0),
                        "duration_seconds": event.data.get("duration_seconds", 0),
                        "error": event.data.get("error") if event.type == EventType.FAILED else None,
                        "timestamp": datetime.now().isoformat(),
                    })
                
                elif event.type == EventType.PROGRESS:
                    # Periodic progress updates
                    async with get_session_context() as session:
                        result = await session.execute(
                            select(JobRun).where(JobRun.id == run_id)
                        )
                        run = result.scalar_one_or_none()
                        if run:
                            run.progress_percent = event.data.get("progress_percent", 0)
                            run.posts_scraped = event.data.get("posts_scraped", 0)
                            run.items_per_minute = event.data.get("items_per_minute", 0)
                            run.eta_seconds = event.data.get("eta_seconds", 0)
                            await session.commit()
        
        except asyncio.CancelledError:
            # Job was cancelled
            async with get_session_context() as session:
                result = await session.execute(
                    select(JobRun).where(JobRun.id == run_id)
                )
                run = result.scalar_one_or_none()
                if run:
                    run.status = JobStatus.CANCELLED.value
                    run.completed_at = datetime.now()
                    await session.commit()
        
        except Exception as e:
            # Unexpected error
            async with get_session_context() as session:
                result = await session.execute(
                    select(JobRun).where(JobRun.id == run_id)
                )
                run = result.scalar_one_or_none()
                if run:
                    run.status = JobStatus.FAILED.value
                    run.error_message = str(e)
                    run.completed_at = datetime.now()
                    await session.commit()


# Global job queue instance
job_queue = JobQueue()
