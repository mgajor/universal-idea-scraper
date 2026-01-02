from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend_db import get_session, JobRun, JobLog, JobStatus
from backend_core import job_queue, ws_manager

router = APIRouter(prefix="/runs", tags=["Runs"])


# --- WebSocket Endpoint ---

@router.websocket("/{run_id}/stream")
async def stream_run(
    websocket: WebSocket,
    run_id: str,
):
    """
    WebSocket endpoint for streaming job run events.
    
    Connect to receive real-time updates for a specific run.
    Events: started, progress, log, metrics, completed, failed, cancelled
    """
    await ws_manager.connect(websocket, run_id)
    
    try:
        while True:
            # Wait for messages from client (heartbeat/commands)
            try:
                data = await websocket.receive_json()
                
                if data.get("type") == "ping":
                    await ws_manager.heartbeat(websocket)
                    await websocket.send_json({"type": "pong"})
                
                elif data.get("type") == "cancel":
                    await job_queue.cancel(run_id)
                    await websocket.send_json({"type": "cancelled"})
                    
            except Exception:
                # Keep connection alive even if receive fails
                pass
                
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket)


# WebSocket endpoint for global notifications (all job events)
notifications_router = APIRouter(prefix="/ws", tags=["WebSocket"])


@notifications_router.websocket("/notifications")
async def stream_notifications(websocket: WebSocket):
    """
    WebSocket endpoint for global notifications.
    
    Connect to receive all job completion/failure notifications.
    Useful for showing toast notifications when on any page.
    Events: job_completed, job_failed, analysis_completed, export_ready
    """
    await ws_manager.connect_global(websocket)
    
    try:
        while True:
            # Keep connection alive and handle pings
            try:
                data = await websocket.receive_json()
                
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    
            except Exception:
                # Keep connection alive even if receive fails
                pass
                
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect_global(websocket)


# --- REST Endpoints ---

from pydantic import BaseModel


class RunResponse(BaseModel):
    """Schema for run response."""
    id: str
    job_id: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    posts_scraped: int
    comments_scraped: int
    media_downloaded: int
    progress_percent: int
    items_per_minute: Optional[float]
    eta_seconds: Optional[int]
    error_message: Optional[str]
    retry_count: int = 0
    
    class Config:
        from_attributes = True


class LogEntry(BaseModel):
    """Schema for log entries."""
    id: int
    timestamp: datetime
    level: str
    message: str
    data: Optional[dict]
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[RunResponse])
async def list_runs(
    status: Optional[str] = Query(None, description="Filter by status"),
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """List all runs with optional filters."""
    query = select(JobRun)
    
    if status:
        query = query.where(JobRun.status == status)
    if job_id:
        query = query.where(JobRun.job_id == job_id)
    
    query = query.order_by(desc(JobRun.started_at)).limit(limit).offset(offset)
    
    result = await session.execute(query)
    runs = result.scalars().all()
    
    return [RunResponse.model_validate(run) for run in runs]


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a single run by ID."""
    result = await session.execute(select(JobRun).where(JobRun.id == run_id))
    run = result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return RunResponse.model_validate(run)


@router.get("/{run_id}/logs", response_model=List[LogEntry])
async def get_run_logs(
    run_id: str,
    level: Optional[str] = Query(None, description="Filter by log level"),
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
):
    """Get logs for a specific run."""
    # Verify run exists
    run_result = await session.execute(select(JobRun).where(JobRun.id == run_id))
    if not run_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Run not found")
    
    query = select(JobLog).where(JobLog.run_id == run_id)
    
    if level:
        query = query.where(JobLog.level == level.upper())
    
    query = query.order_by(JobLog.timestamp).limit(limit)
    
    result = await session.execute(query)
    logs = result.scalars().all()
    
    return [LogEntry.model_validate(log) for log in logs]


@router.post("/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Cancel a running job."""
    result = await session.execute(select(JobRun).where(JobRun.id == run_id))
    run = result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run.status not in [JobStatus.PENDING.value, JobStatus.RUNNING.value]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel run in status: {run.status}")
    
    # Cancel via queue
    cancelled = await job_queue.cancel(run_id)
    
    if not cancelled:
        # Update status directly if not in queue
        run.status = JobStatus.CANCELLED.value
        run.completed_at = datetime.now()
        await session.commit()
    
    return {"message": "Run cancelled", "run_id": run_id}


@router.post("/{run_id}/retry")
async def retry_run(
    run_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Retry a failed run."""
    result = await session.execute(select(JobRun).where(JobRun.id == run_id))
    run = result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run.status not in [JobStatus.FAILED.value, JobStatus.CANCELLED.value]:
        raise HTTPException(status_code=400, detail=f"Cannot retry run in status: {run.status}")
    
    # Get the job to re-enqueue
    from ..db import Job
    job_result = await session.execute(select(Job).where(Job.id == run.job_id))
    job = job_result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")
    
    # Enqueue new run
    new_run_id = await job_queue.enqueue(
        job_id=job.id,
        target=job.target,
        mode=job.mode,
        limit=job.limit,
        is_user=job.is_user,
        download_media=job.download_media,
        scrape_comments=job.scrape_comments,
        use_plugins=job.use_plugins,
    )
    
    return {
        "message": "Run retried",
        "original_run_id": run_id,
        "new_run_id": new_run_id,
    }
