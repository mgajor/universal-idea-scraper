"""
Digest API Routes

Endpoints for managing weekly digest email settings and previews.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, EmailStr

from backend_db import get_session, DigestSettings
from backend_db.discovery_models import DiscoveredProblem, ProblemInsight

router = APIRouter(prefix="/digest", tags=["Digest"])


# --- Schemas ---

class DigestSettingsSchema(BaseModel):
    """Digest settings configuration."""
    email: Optional[str] = None
    is_enabled: bool = False
    schedule_day: int = 0  # Monday
    schedule_hour: int = 9  # 9 AM
    min_opportunity_score: int = 6
    include_unanalyzed: bool = False
    max_problems: int = 20
    platforms: List[str] = []


class DigestSettingsResponse(DigestSettingsSchema):
    """Response with additional metadata."""
    id: str
    last_sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class DigestProblemPreview(BaseModel):
    """Problem summary for digest preview."""
    id: str
    title: str
    platform: str
    opportunity_score: Optional[int] = None
    category: Optional[str] = None
    problem_summary: Optional[str] = None
    discovered_at: datetime


class DigestPreview(BaseModel):
    """Preview of what the digest email would contain."""
    period_start: datetime
    period_end: datetime
    total_discovered: int
    total_analyzed: int
    avg_score: float
    problems: List[DigestProblemPreview]


# --- Day Names ---
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# --- Routes ---

@router.get("/settings", response_model=DigestSettingsResponse)
async def get_digest_settings(
    session: AsyncSession = Depends(get_session),
):
    """Get current digest settings."""
    result = await session.execute(select(DigestSettings).limit(1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create default settings
        settings = DigestSettings()
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
    
    return DigestSettingsResponse(
        id=settings.id,
        email=settings.email,
        is_enabled=settings.is_enabled,
        schedule_day=settings.schedule_day,
        schedule_hour=settings.schedule_hour,
        min_opportunity_score=settings.min_opportunity_score,
        include_unanalyzed=settings.include_unanalyzed,
        max_problems=settings.max_problems,
        platforms=settings.platforms or [],
        last_sent_at=settings.last_sent_at,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


@router.put("/settings", response_model=DigestSettingsResponse)
async def update_digest_settings(
    data: DigestSettingsSchema,
    session: AsyncSession = Depends(get_session),
):
    """Update digest settings."""
    result = await session.execute(select(DigestSettings).limit(1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = DigestSettings()
        session.add(settings)
    
    # Update fields
    settings.email = data.email
    settings.is_enabled = data.is_enabled
    settings.schedule_day = data.schedule_day
    settings.schedule_hour = data.schedule_hour
    settings.min_opportunity_score = data.min_opportunity_score
    settings.include_unanalyzed = data.include_unanalyzed
    settings.max_problems = data.max_problems
    settings.platforms = data.platforms
    settings.updated_at = datetime.now()
    
    await session.commit()
    await session.refresh(settings)
    
    return DigestSettingsResponse(
        id=settings.id,
        email=settings.email,
        is_enabled=settings.is_enabled,
        schedule_day=settings.schedule_day,
        schedule_hour=settings.schedule_hour,
        min_opportunity_score=settings.min_opportunity_score,
        include_unanalyzed=settings.include_unanalyzed,
        max_problems=settings.max_problems,
        platforms=settings.platforms or [],
        last_sent_at=settings.last_sent_at,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


@router.get("/preview", response_model=DigestPreview)
async def get_digest_preview(
    days: int = Query(7, ge=1, le=30, description="Number of days to include"),
    session: AsyncSession = Depends(get_session),
):
    """Preview what the digest email would contain."""
    from sqlalchemy.orm import selectinload
    from sqlalchemy import func
    
    # Get settings for preferences
    settings_result = await session.execute(select(DigestSettings).limit(1))
    settings = settings_result.scalar_one_or_none()
    
    min_score = settings.min_opportunity_score if settings else 6
    max_problems = settings.max_problems if settings else 20
    platforms = settings.platforms if settings else []
    
    # Calculate period
    period_end = datetime.now()
    period_start = period_end - timedelta(days=days)
    
    # Query problems with insights
    query = (
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(
            DiscoveredProblem.discovered_at >= period_start,
            DiscoveredProblem.is_hidden == False,
        )
    )
    
    # Platform filter
    if platforms:
        query = query.where(DiscoveredProblem.platform.in_(platforms))
    
    query = query.order_by(desc(DiscoveredProblem.discovered_at))
    
    result = await session.execute(query)
    all_problems = result.scalars().all()
    
    # Filter by score
    problems_with_scores = []
    for p in all_problems:
        if p.insight and p.insight.opportunity_score >= min_score:
            problems_with_scores.append(p)
    
    # Sort by score descending
    problems_with_scores.sort(key=lambda x: x.insight.opportunity_score if x.insight else 0, reverse=True)
    
    # Limit
    top_problems = problems_with_scores[:max_problems]
    
    # Calculate stats
    total_discovered = len(all_problems)
    analyzed = [p for p in all_problems if p.insight]
    total_analyzed = len(analyzed)
    avg_score = sum(p.insight.opportunity_score for p in analyzed) / total_analyzed if total_analyzed else 0
    
    return DigestPreview(
        period_start=period_start,
        period_end=period_end,
        total_discovered=total_discovered,
        total_analyzed=total_analyzed,
        avg_score=round(avg_score, 1),
        problems=[
            DigestProblemPreview(
                id=p.id,
                title=p.title,
                platform=p.platform,
                opportunity_score=p.insight.opportunity_score if p.insight else None,
                category=p.insight.category if p.insight else None,
                problem_summary=p.insight.problem_summary if p.insight else None,
                discovered_at=p.discovered_at,
            )
            for p in top_problems
        ],
    )


@router.post("/send-test")
async def send_test_digest(
    email: Optional[str] = Query(None, description="Override email address"),
    session: AsyncSession = Depends(get_session),
):
    """Send a test digest email using Resend."""
    from sqlalchemy.orm import selectinload
    from backend_core.email_service import get_email_service
    
    # Get settings
    settings_result = await session.execute(select(DigestSettings).limit(1))
    settings = settings_result.scalar_one_or_none()
    
    target_email = email or (settings.email if settings else None)
    
    if not target_email:
        raise HTTPException(status_code=400, detail="No email address configured")
    
    # Get email service
    email_service = get_email_service()
    
    if not email_service.is_configured:
        return {
            "success": False,
            "message": "RESEND_API_KEY not configured",
            "note": "Add RESEND_API_KEY to your .env file to enable email sending",
        }
    
    # Get preview data for email content
    min_score = settings.min_opportunity_score if settings else 6
    max_problems = settings.max_problems if settings else 20
    period_end = datetime.now()
    period_start = period_end - timedelta(days=7)
    
    query = (
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(
            DiscoveredProblem.discovered_at >= period_start,
            DiscoveredProblem.is_hidden == False,
        )
        .order_by(desc(DiscoveredProblem.discovered_at))
    )
    
    result = await session.execute(query)
    all_problems = result.scalars().all()
    
    # Filter and sort
    analyzed = [p for p in all_problems if p.insight]
    high_potential = [p for p in analyzed if p.insight.opportunity_score >= min_score]
    high_potential.sort(key=lambda x: x.insight.opportunity_score, reverse=True)
    top_problems = high_potential[:max_problems]
    
    # Format for email
    problems_data = [
        {
            "title": p.title,
            "platform": p.platform,
            "opportunity_score": p.insight.opportunity_score,
            "category": p.insight.category,
        }
        for p in top_problems
    ]
    
    stats = {
        "total_discovered": len(all_problems),
        "total_analyzed": len(analyzed),
        "high_potential": len(high_potential),
    }
    
    # Send email
    result = await email_service.send_digest(
        to=target_email,
        problems=problems_data,
        stats=stats,
        period_days=7,
    )
    
    if result.success:
        # Update last_sent_at
        if settings:
            settings.last_sent_at = datetime.now()
            await session.commit()
        
        return {
            "success": True,
            "message": f"Digest sent to {target_email}",
            "message_id": result.message_id,
            "problems_included": len(problems_data),
        }
    else:
        return {
            "success": False,
            "message": f"Failed to send: {result.error}",
        }


@router.get("/schedule-info")
async def get_schedule_info(
    session: AsyncSession = Depends(get_session),
):
    """Get information about the digest schedule."""
    settings_result = await session.execute(select(DigestSettings).limit(1))
    settings = settings_result.scalar_one_or_none()
    
    if not settings or not settings.is_enabled:
        return {
            "is_enabled": False,
            "next_run": None,
            "schedule_description": "Digest is not enabled",
        }
    
    day_name = DAY_NAMES[settings.schedule_day]
    hour = settings.schedule_hour
    hour_str = f"{hour}:00" if hour >= 10 else f"0{hour}:00"
    
    return {
        "is_enabled": True,
        "schedule_day": settings.schedule_day,
        "schedule_hour": settings.schedule_hour,
        "schedule_description": f"Every {day_name} at {hour_str}",
        "last_sent_at": settings.last_sent_at,
        "email": settings.email,
    }
