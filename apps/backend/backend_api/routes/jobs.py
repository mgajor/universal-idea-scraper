from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel, Field

from backend_db import get_session, Job, JobRun, JobStatus, JobMode
from backend_core import job_queue

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# --- Pydantic Schemas ---

class JobCreate(BaseModel):
    """Schema for creating a new job."""
    name: str = Field(..., min_length=1, max_length=255)
    target: str = Field(..., min_length=1, max_length=255)
    is_user: bool = False
    mode: str = Field(default="full", pattern="^(full|history|monitor)$")
    limit: int = Field(default=100, ge=1, le=10000)
    download_media: bool = True
    scrape_comments: bool = True
    use_plugins: bool = False
    dedupe: bool = True
    schedule: Optional[str] = None
    plugins_config: Optional[dict] = None


class JobUpdate(BaseModel):
    """Schema for updating a job."""
    name: Optional[str] = None
    mode: Optional[str] = None
    limit: Optional[int] = None
    download_media: Optional[bool] = None
    scrape_comments: Optional[bool] = None
    use_plugins: Optional[bool] = None
    schedule: Optional[str] = None
    enabled: Optional[bool] = None


class JobResponse(BaseModel):
    """Schema for job response."""
    id: str
    name: str
    target: str
    is_user: bool
    mode: str
    limit: int
    download_media: bool
    scrape_comments: bool
    use_plugins: bool
    enabled: bool
    schedule: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    total_runs: int = 0
    
    class Config:
        from_attributes = True


class JobRunResponse(BaseModel):
    """Schema for job run response."""
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
    
    class Config:
        from_attributes = True


class RunJobResponse(BaseModel):
    """Response when starting a job run."""
    run_id: str
    job_id: str
    status: str
    message: str


# --- Routes ---

@router.get("", response_model=List[JobResponse])
async def list_jobs(
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    target: Optional[str] = Query(None, description="Filter by target"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """List all jobs with optional filters."""
    query = select(Job)
    
    if enabled is not None:
        query = query.where(Job.enabled == enabled)
    if target:
        query = query.where(Job.target.ilike(f"%{target}%"))
    
    query = query.order_by(desc(Job.updated_at)).limit(limit).offset(offset)
    
    result = await session.execute(query)
    jobs = result.scalars().all()
    
    # Enrich with run stats
    response = []
    for job in jobs:
        job_dict = {
            "id": job.id,
            "name": job.name,
            "target": job.target,
            "is_user": job.is_user,
            "mode": job.mode,
            "limit": job.limit,
            "download_media": job.download_media,
            "scrape_comments": job.scrape_comments,
            "use_plugins": job.use_plugins,
            "enabled": job.enabled,
            "schedule": job.schedule,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
        }
        
        # Get last run info
        run_query = select(JobRun).where(JobRun.job_id == job.id).order_by(desc(JobRun.started_at)).limit(1)
        run_result = await session.execute(run_query)
        last_run = run_result.scalar_one_or_none()
        
        if last_run:
            job_dict["last_run_at"] = last_run.started_at
            job_dict["last_run_status"] = last_run.status
        
        # Get total runs
        count_query = select(func.count()).select_from(JobRun).where(JobRun.job_id == job.id)
        count_result = await session.execute(count_query)
        job_dict["total_runs"] = count_result.scalar() or 0
        
        response.append(JobResponse(**job_dict))
    
    return response


@router.post("", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new job."""
    job = Job(
        name=job_data.name,
        target=job_data.target,
        is_user=job_data.is_user,
        mode=job_data.mode,
        limit=job_data.limit,
        download_media=job_data.download_media,
        scrape_comments=job_data.scrape_comments,
        use_plugins=job_data.use_plugins,
        dedupe=job_data.dedupe,
        schedule=job_data.schedule,
        plugins_config=job_data.plugins_config,
    )
    
    session.add(job)
    await session.commit()
    await session.refresh(job)
    
    return JobResponse(
        id=job.id,
        name=job.name,
        target=job.target,
        is_user=job.is_user,
        mode=job.mode,
        limit=job.limit,
        download_media=job.download_media,
        scrape_comments=job.scrape_comments,
        use_plugins=job.use_plugins,
        enabled=job.enabled,
        schedule=job.schedule,
        created_at=job.created_at,
        updated_at=job.updated_at,
        total_runs=0,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a single job by ID."""
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get run stats
    run_query = select(JobRun).where(JobRun.job_id == job.id).order_by(desc(JobRun.started_at)).limit(1)
    run_result = await session.execute(run_query)
    last_run = run_result.scalar_one_or_none()
    
    count_query = select(func.count()).select_from(JobRun).where(JobRun.job_id == job.id)
    count_result = await session.execute(count_query)
    total_runs = count_result.scalar() or 0
    
    return JobResponse(
        id=job.id,
        name=job.name,
        target=job.target,
        is_user=job.is_user,
        mode=job.mode,
        limit=job.limit,
        download_media=job.download_media,
        scrape_comments=job.scrape_comments,
        use_plugins=job.use_plugins,
        enabled=job.enabled,
        schedule=job.schedule,
        created_at=job.created_at,
        updated_at=job.updated_at,
        last_run_at=last_run.started_at if last_run else None,
        last_run_status=last_run.status if last_run else None,
        total_runs=total_runs,
    )


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_data: JobUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update a job."""
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update fields
    update_data = job_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)
    
    await session.commit()
    await session.refresh(job)
    
    return await get_job(job_id, session)


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Delete a job and all its runs."""
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await session.delete(job)
    await session.commit()
    
    return {"message": "Job deleted", "id": job_id}


@router.post("/{job_id}/run", response_model=RunJobResponse)
async def run_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Start a new run for a job."""
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.enabled:
        raise HTTPException(status_code=400, detail="Job is disabled")
    
    # Enqueue the job
    run_id = await job_queue.enqueue(
        job_id=job.id,
        target=job.target,
        mode=job.mode,
        limit=job.limit,
        is_user=job.is_user,
        download_media=job.download_media,
        scrape_comments=job.scrape_comments,
        use_plugins=job.use_plugins,
    )
    
    return RunJobResponse(
        run_id=run_id,
        job_id=job_id,
        status="pending",
        message=f"Job queued. Connect to WebSocket at /ws/runs/{run_id} for live updates.",
    )


@router.post("/{job_id}/clone", response_model=JobResponse)
async def clone_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Clone a job with a new ID."""
    result = await session.execute(select(Job).where(Job.id == job_id))
    original = result.scalar_one_or_none()
    
    if not original:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create clone
    clone = Job(
        name=f"{original.name} (Copy)",
        target=original.target,
        is_user=original.is_user,
        mode=original.mode,
        limit=original.limit,
        download_media=original.download_media,
        scrape_comments=original.scrape_comments,
        use_plugins=original.use_plugins,
        dedupe=original.dedupe,
        schedule=None,  # Don't copy schedule
        plugins_config=original.plugins_config,
    )
    
    session.add(clone)
    await session.commit()
    await session.refresh(clone)
    
    return await get_job(clone.id, session)


@router.get("/{job_id}/runs", response_model=List[JobRunResponse])
async def list_job_runs(
    job_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Get run history for a job."""
    # Verify job exists
    job_result = await session.execute(select(Job).where(Job.id == job_id))
    if not job_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")
    
    query = select(JobRun).where(JobRun.job_id == job_id)
    
    if status:
        query = query.where(JobRun.status == status)
    
    query = query.order_by(desc(JobRun.started_at)).limit(limit).offset(offset)
    
    result = await session.execute(query)
    runs = result.scalars().all()
    
    return [JobRunResponse.model_validate(run) for run in runs]
