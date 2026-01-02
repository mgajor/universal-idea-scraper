"""
Problem Discovery API Routes

Endpoints for:
- Search job management (CRUD, run)
- Discovered problems (list, save, hide)
- AI enrichment (analyze)
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from pydantic import BaseModel, Field

from backend_db import get_session
from backend_db.discovery_models import SearchJob, DiscoveredProblem, ProblemInsight, SearchStatus
from backend_core.apify_service import apify_service, Platform, DEFAULT_KEYWORDS
from backend_core.ai_enrichment import ai_enrichment


router = APIRouter(prefix="/discovery", tags=["Discovery"])


# --- Pydantic Schemas ---

class SearchJobCreate(BaseModel):
    """Create a new search job."""
    name: str = Field(..., min_length=1, max_length=255)
    keywords: List[str] = Field(default_factory=lambda: DEFAULT_KEYWORDS[:5])
    platforms: List[str] = Field(default=["reddit", "hackernews", "producthunt"])
    max_results: int = Field(default=50, ge=10, le=200)
    time_filter: str = Field(default="m", pattern="^[dwmy]$")


class SearchJobResponse(BaseModel):
    """Search job response."""
    id: str
    name: str
    keywords: List[str]
    platforms: List[str]
    max_results: int
    time_filter: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    total_results: int
    results_analyzed: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProblemResponse(BaseModel):
    """Discovered problem response."""
    id: str
    url: str
    title: str
    snippet: Optional[str]
    platform: str
    keyword_matched: Optional[str]
    is_saved: bool
    is_hidden: bool
    notes: Optional[str]
    discovered_at: datetime
    
    # Insight preview (if analyzed)
    opportunity_score: Optional[int] = None
    category: Optional[str] = None
    problem_summary: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProblemDetailResponse(ProblemResponse):
    """Full problem detail with insights."""
    insight: Optional[dict] = None


class KeywordsResponse(BaseModel):
    """Default keywords list."""
    keywords: List[str]


class PlatformsResponse(BaseModel):
    """Available platforms."""
    platforms: List[dict]


class TrendPoint(BaseModel):
    """A single point in a trend time series."""
    date: str
    count: int


class PlatformTrend(BaseModel):
    """Trend data by platform."""
    platform: str
    count: int
    change_percent: Optional[float] = None


class CategoryTrend(BaseModel):
    """Trend data by category."""
    category: str
    count: int
    avg_score: Optional[float] = None


class TrendingSummary(BaseModel):
    """Summary of trending data."""
    total_problems: int
    total_analyzed: int
    avg_opportunity_score: float
    top_categories: List[CategoryTrend]
    platform_breakdown: List[PlatformTrend]
    daily_trend: List[TrendPoint]


# --- Config Endpoints ---

@router.get("/keywords", response_model=KeywordsResponse)
async def get_default_keywords():
    """Get the default list of problem-signal keywords."""
    return {"keywords": DEFAULT_KEYWORDS}


@router.get("/platforms", response_model=PlatformsResponse)
async def get_available_platforms():
    """Get available platforms for searching."""
    return {
        "platforms": [
            {"id": "reddit", "name": "Reddit", "icon": "🔴"},
            {"id": "hackernews", "name": "Hacker News", "icon": "🟠"},
            {"id": "twitter", "name": "Twitter/X", "icon": "🐦"},
            {"id": "indiehackers", "name": "Indie Hackers", "icon": "💼"},
            {"id": "quora", "name": "Quora", "icon": "❓"},
            {"id": "producthunt", "name": "Product Hunt", "icon": "🚀"},
        ]
    }


# --- Search Job Endpoints ---

@router.get("/jobs", response_model=List[SearchJobResponse])
async def list_search_jobs(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """List all search jobs."""
    query = select(SearchJob)
    
    if status:
        query = query.where(SearchJob.status == status)
    
    query = query.order_by(desc(SearchJob.created_at)).limit(limit).offset(offset)
    
    result = await session.execute(query)
    jobs = result.scalars().all()
    
    return [SearchJobResponse.model_validate(j) for j in jobs]


@router.post("/jobs", response_model=SearchJobResponse)
async def create_search_job(
    job_data: SearchJobCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new search job."""
    job = SearchJob(
        name=job_data.name,
        keywords=job_data.keywords,
        platforms=job_data.platforms,
        max_results=job_data.max_results,
        time_filter=job_data.time_filter,
    )
    
    session.add(job)
    await session.commit()
    await session.refresh(job)
    
    return SearchJobResponse.model_validate(job)


@router.post("/jobs/{job_id}/run")
async def run_search_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Start running a search job."""
    import asyncio
    
    result = await session.execute(select(SearchJob).where(SearchJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Search job not found")
    
    if job.status == SearchStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Job is already running")
    
    # Check Apify configuration
    if not apify_service.is_configured:
        raise HTTPException(
            status_code=400, 
            detail="Apify API token not configured. Set APIFY_API_TOKEN in .env"
        )
    
    # Update status
    job.status = SearchStatus.RUNNING.value
    job.started_at = datetime.now()
    await session.commit()
    
    # Run in background using asyncio.create_task (properly handles async)
    asyncio.create_task(execute_search_job(job_id))
    
    return {"message": "Search job started", "job_id": job_id}


@router.delete("/jobs/{job_id}")
async def delete_search_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Delete a search job and its results."""
    result = await session.execute(select(SearchJob).where(SearchJob.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Search job not found")
    
    await session.delete(job)
    await session.commit()
    
    return {"message": "Search job deleted", "id": job_id}


# --- Problem Endpoints ---

@router.get("/problems", response_model=List[ProblemResponse])
async def list_problems(
    search_job_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    is_saved: Optional[bool] = Query(None),
    min_score: Optional[int] = Query(None, ge=1, le=10),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """List discovered problems with filters."""
    from sqlalchemy.orm import selectinload
    
    query = select(DiscoveredProblem).options(selectinload(DiscoveredProblem.insight)).where(DiscoveredProblem.is_hidden == False)
    
    if search_job_id:
        query = query.where(DiscoveredProblem.search_job_id == search_job_id)
    if platform:
        query = query.where(DiscoveredProblem.platform == platform)
    if is_saved is not None:
        query = query.where(DiscoveredProblem.is_saved == is_saved)
    if search:
        query = query.where(
            or_(
                DiscoveredProblem.title.ilike(f"%{search}%"),
                DiscoveredProblem.snippet.ilike(f"%{search}%")
            )
        )
    
    query = query.order_by(desc(DiscoveredProblem.discovered_at)).limit(limit).offset(offset)
    
    result = await session.execute(query)
    problems = result.scalars().all()
    
    # Build response with insight preview
    response = []
    for p in problems:
        data = {
            "id": p.id,
            "url": p.url,
            "title": p.title,
            "snippet": p.snippet,
            "platform": p.platform,
            "keyword_matched": p.keyword_matched,
            "is_saved": p.is_saved,
            "is_hidden": p.is_hidden,
            "notes": p.notes,
            "discovered_at": p.discovered_at,
        }
        
        # Add insight preview if exists
        if p.insight:
            data["opportunity_score"] = p.insight.opportunity_score
            data["category"] = p.insight.category
            data["problem_summary"] = p.insight.problem_summary
        
        response.append(ProblemResponse(**data))
    
    return response


@router.get("/problems/{problem_id}", response_model=ProblemDetailResponse)
async def get_problem(
    problem_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a single problem with full insights."""
    from sqlalchemy.orm import selectinload
    
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(DiscoveredProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    data = {
        "id": problem.id,
        "url": problem.url,
        "title": problem.title,
        "snippet": problem.snippet,
        "platform": problem.platform,
        "keyword_matched": problem.keyword_matched,
        "is_saved": problem.is_saved,
        "is_hidden": problem.is_hidden,
        "notes": problem.notes,
        "discovered_at": problem.discovered_at,
    }
    
    if problem.insight:
        data["opportunity_score"] = problem.insight.opportunity_score
        data["category"] = problem.insight.category
        data["problem_summary"] = problem.insight.problem_summary
        data["insight"] = {
            # Core analysis
            "job_to_be_done": problem.insight.job_to_be_done,
            "score_reasoning": problem.insight.score_reasoning,
            "demand_signals": problem.insight.demand_signals,
            
            # Competitive Intelligence
            "competitors": problem.insight.competitors,
            "market_gaps": problem.insight.market_gaps,
            "improvement_opportunities": problem.insight.improvement_opportunities,
            
            # Enhanced Market Analysis (NEW)
            "market_sizing": problem.insight.market_sizing,
            "validation_metrics": problem.insight.validation_metrics,
            "risk_assessment": problem.insight.risk_assessment,
            "execution_roadmap": problem.insight.execution_roadmap,
            "comparable_exits": problem.insight.comparable_exits,
            
            # Legacy fields
            "market_size_estimate": problem.insight.market_size_estimate,
            "existing_solutions": problem.insight.existing_solutions,
            "solution_gaps": problem.insight.solution_gaps,
            
            # Actionable insights
            "suggested_approaches": problem.insight.suggested_approaches,
            "target_audience": problem.insight.target_audience,
            "monetization_potential": problem.insight.monetization_potential,
            "recommended_next_steps": problem.insight.recommended_next_steps,
            
            # Meta
            "model_used": problem.insight.model_used,
            "analyzed_at": problem.insight.analyzed_at.isoformat() if problem.insight.analyzed_at else None,
        }
    
    return ProblemDetailResponse(**data)


@router.post("/problems/{problem_id}/save")
async def toggle_save_problem(
    problem_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Toggle saved status on a problem."""
    result = await session.execute(
        select(DiscoveredProblem).where(DiscoveredProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    problem.is_saved = not problem.is_saved
    await session.commit()
    
    return {"is_saved": problem.is_saved}


@router.post("/problems/{problem_id}/hide")
async def hide_problem(
    problem_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Hide a problem from results."""
    result = await session.execute(
        select(DiscoveredProblem).where(DiscoveredProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    problem.is_hidden = True
    await session.commit()
    
    return {"message": "Problem hidden"}


@router.post("/problems/{problem_id}/analyze")
async def analyze_problem(
    problem_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Run AI analysis on a single problem."""
    from sqlalchemy.orm import selectinload
    
    if not ai_enrichment.is_configured:
        raise HTTPException(
            status_code=400,
            detail="OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env"
        )
    
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(DiscoveredProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Run AI analysis
    insight_data = await ai_enrichment.analyze_problem(
        title=problem.title,
        snippet=problem.snippet or "",
        url=problem.url,
        platform=problem.platform,
    )
    
    if not insight_data:
        raise HTTPException(status_code=500, detail="AI analysis failed")
    
    # Save or update insight
    if problem.insight:
        # Update existing
        problem.insight.category = insight_data.category.value
        problem.insight.problem_summary = insight_data.problem_summary
        problem.insight.job_to_be_done = insight_data.job_to_be_done
        problem.insight.opportunity_score = insight_data.opportunity_score
        problem.insight.score_reasoning = insight_data.score_reasoning
        problem.insight.demand_signals = insight_data.demand_signals
        problem.insight.competitors = insight_data.competitors
        problem.insight.market_gaps = insight_data.market_gaps
        problem.insight.improvement_opportunities = insight_data.improvement_opportunities
        # NEW Enhanced Market Analysis fields
        problem.insight.market_sizing = insight_data.market_sizing
        problem.insight.validation_metrics = insight_data.validation_metrics
        problem.insight.risk_assessment = insight_data.risk_assessment
        problem.insight.execution_roadmap = insight_data.execution_roadmap
        problem.insight.comparable_exits = insight_data.comparable_exits
        # Legacy fields
        problem.insight.market_size_estimate = insight_data.market_size_estimate
        problem.insight.existing_solutions = insight_data.existing_solutions
        problem.insight.solution_gaps = insight_data.solution_gaps
        problem.insight.suggested_approaches = insight_data.suggested_approaches
        problem.insight.target_audience = insight_data.target_audience
        problem.insight.monetization_potential = insight_data.monetization_potential
        problem.insight.recommended_next_steps = insight_data.recommended_next_steps
        problem.insight.model_used = insight_data.model_used
        problem.insight.analyzed_at = datetime.now()
    else:
        # Create new
        insight = ProblemInsight(
            problem_id=problem.id,
            category=insight_data.category.value,
            problem_summary=insight_data.problem_summary,
            job_to_be_done=insight_data.job_to_be_done,
            opportunity_score=insight_data.opportunity_score,
            score_reasoning=insight_data.score_reasoning,
            demand_signals=insight_data.demand_signals,
            competitors=insight_data.competitors,
            market_gaps=insight_data.market_gaps,
            improvement_opportunities=insight_data.improvement_opportunities,
            # NEW Enhanced Market Analysis fields
            market_sizing=insight_data.market_sizing,
            validation_metrics=insight_data.validation_metrics,
            risk_assessment=insight_data.risk_assessment,
            execution_roadmap=insight_data.execution_roadmap,
            comparable_exits=insight_data.comparable_exits,
            # Legacy fields
            market_size_estimate=insight_data.market_size_estimate,
            existing_solutions=insight_data.existing_solutions,
            solution_gaps=insight_data.solution_gaps,
            suggested_approaches=insight_data.suggested_approaches,
            target_audience=insight_data.target_audience,
            monetization_potential=insight_data.monetization_potential,
            recommended_next_steps=insight_data.recommended_next_steps,
            model_used=insight_data.model_used,
        )
        session.add(insight)
    
    await session.commit()
    
    return {"message": "Analysis complete", "opportunity_score": insight_data.opportunity_score}


# Store for active bulk analysis jobs (in-memory for simplicity)
_bulk_analysis_jobs: dict = {}


class BulkAnalysisStatus(BaseModel):
    """Status of a bulk analysis job."""
    job_id: str
    status: str  # pending, running, completed, failed
    total: int
    completed: int
    failed: int
    current_problem: Optional[str] = None
    errors: List[str] = []


@router.post("/problems/bulk-analyze")
async def start_bulk_analysis(
    limit: int = Query(50, ge=1, le=200, description="Max problems to analyze"),
    session: AsyncSession = Depends(get_session),
):
    """Start bulk AI analysis on unanalyzed problems."""
    import asyncio
    
    if not ai_enrichment.is_configured:
        raise HTTPException(
            status_code=400,
            detail="OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env"
        )
    
    # Find unanalyzed problems
    from sqlalchemy.orm import selectinload
    
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(DiscoveredProblem.is_hidden == False)
        .order_by(desc(DiscoveredProblem.discovered_at))
        .limit(limit * 2)  # Get more to filter
    )
    all_problems = result.scalars().all()
    
    # Filter to only unanalyzed
    unanalyzed = [p for p in all_problems if p.insight is None][:limit]
    
    if not unanalyzed:
        return {"message": "No unanalyzed problems found", "job_id": None, "total": 0}
    
    # Create job ID
    import uuid
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    _bulk_analysis_jobs[job_id] = {
        "status": "running",
        "total": len(unanalyzed),
        "completed": 0,
        "failed": 0,
        "current_problem": None,
        "errors": [],
        "problem_ids": [p.id for p in unanalyzed],
    }
    
    # Start analysis in background
    asyncio.create_task(execute_bulk_analysis(job_id))
    
    return {
        "message": f"Started bulk analysis for {len(unanalyzed)} problems",
        "job_id": job_id,
        "total": len(unanalyzed),
    }


@router.get("/problems/bulk-analyze/{job_id}", response_model=BulkAnalysisStatus)
async def get_bulk_analysis_status(job_id: str):
    """Get the status of a bulk analysis job."""
    if job_id not in _bulk_analysis_jobs:
        raise HTTPException(status_code=404, detail="Bulk analysis job not found")
    
    job = _bulk_analysis_jobs[job_id]
    return BulkAnalysisStatus(
        job_id=job_id,
        status=job["status"],
        total=job["total"],
        completed=job["completed"],
        failed=job["failed"],
        current_problem=job.get("current_problem"),
        errors=job.get("errors", [])[:5],  # Limit errors returned
    )


async def execute_bulk_analysis(job_id: str):
    """Execute bulk analysis in background."""
    import asyncio
    from backend_db import get_session_context
    
    job = _bulk_analysis_jobs.get(job_id)
    if not job:
        return
    
    problem_ids = job["problem_ids"]
    
    for problem_id in problem_ids:
        try:
            async with get_session_context() as session:
                from sqlalchemy.orm import selectinload
                
                result = await session.execute(
                    select(DiscoveredProblem)
                    .options(selectinload(DiscoveredProblem.insight))
                    .where(DiscoveredProblem.id == problem_id)
                )
                problem = result.scalar_one_or_none()
                
                if not problem:
                    job["failed"] += 1
                    continue
                
                # Update current problem
                job["current_problem"] = problem.title[:50]
                
                # Skip if already analyzed
                if problem.insight:
                    job["completed"] += 1
                    continue
                
                # Run AI analysis
                insight_data = await ai_enrichment.analyze_problem(
                    title=problem.title,
                    snippet=problem.snippet or "",
                    url=problem.url,
                    platform=problem.platform,
                )
                
                if not insight_data:
                    job["failed"] += 1
                    job["errors"].append(f"Analysis failed for: {problem.title[:30]}...")
                    continue
                
                # Save insight
                insight = ProblemInsight(
                    problem_id=problem.id,
                    category=insight_data.category.value,
                    problem_summary=insight_data.problem_summary,
                    job_to_be_done=insight_data.job_to_be_done,
                    opportunity_score=insight_data.opportunity_score,
                    score_reasoning=insight_data.score_reasoning,
                    demand_signals=insight_data.demand_signals,
                    competitors=insight_data.competitors,
                    market_gaps=insight_data.market_gaps,
                    improvement_opportunities=insight_data.improvement_opportunities,
                    # NEW Enhanced Market Analysis fields
                    market_sizing=insight_data.market_sizing,
                    validation_metrics=insight_data.validation_metrics,
                    risk_assessment=insight_data.risk_assessment,
                    execution_roadmap=insight_data.execution_roadmap,
                    comparable_exits=insight_data.comparable_exits,
                    # Legacy fields
                    market_size_estimate=insight_data.market_size_estimate,
                    existing_solutions=insight_data.existing_solutions,
                    solution_gaps=insight_data.solution_gaps,
                    suggested_approaches=insight_data.suggested_approaches,
                    target_audience=insight_data.target_audience,
                    monetization_potential=insight_data.monetization_potential,
                    recommended_next_steps=insight_data.recommended_next_steps,
                    model_used=insight_data.model_used,
                )
                session.add(insight)
                await session.commit()
                
                job["completed"] += 1
                
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
            
        except Exception as e:
            job["failed"] += 1
            job["errors"].append(str(e)[:100])
    
    # Mark as completed
    job["status"] = "completed"
    job["current_problem"] = None


# --- Background Task ---

async def execute_search_job(job_id: str):
    """Execute a search job in the background."""
    from backend_db import get_session_context
    
    async with get_session_context() as session:
        result = await session.execute(select(SearchJob).where(SearchJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            return
        
        try:
            # Convert platform strings to enum
            platforms = [Platform(p) for p in job.platforms if p in [e.value for e in Platform]]
            
            # Run search
            results = await apify_service.search(
                keywords=job.keywords,
                platforms=platforms,
                max_results_per_keyword=job.max_results // len(job.keywords) if job.keywords else 10,
                time_filter=job.time_filter,
            )
            
            # Save results (dedupe by URL)
            new_count = 0
            for r in results:
                # Check if URL already exists
                existing = await session.execute(
                    select(DiscoveredProblem).where(DiscoveredProblem.url == r.url)
                )
                if existing.scalar_one_or_none():
                    continue
                
                problem = DiscoveredProblem(
                    search_job_id=job.id,
                    url=r.url,
                    title=r.title,
                    snippet=r.snippet,
                    platform=r.platform.value,
                    keyword_matched=r.keyword_matched,
                )
                session.add(problem)
                new_count += 1
            
            # Update job status
            job.status = SearchStatus.COMPLETED.value
            job.completed_at = datetime.now()
            job.total_results = new_count
            
            await session.commit()
            
        except Exception as e:
            job.status = SearchStatus.FAILED.value
            job.completed_at = datetime.now()
            job.error_message = str(e)
            await session.commit()


# --- Trends Endpoints ---

@router.get("/trends", response_model=TrendingSummary)
async def get_discovery_trends(
    days: int = Query(30, ge=7, le=90, description="Number of days to analyze"),
    session: AsyncSession = Depends(get_session),
):
    """Get trend analysis for discovered problems."""
    from sqlalchemy.orm import selectinload
    from backend_db.discovery_models import ProblemInsight
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Total problems
    total_result = await session.execute(
        select(func.count()).select_from(DiscoveredProblem)
        .where(DiscoveredProblem.discovered_at >= start_date)
    )
    total_problems = total_result.scalar() or 0
    
    # Problems with insights
    analyzed_result = await session.execute(
        select(func.count()).select_from(DiscoveredProblem)
        .join(ProblemInsight)
        .where(DiscoveredProblem.discovered_at >= start_date)
    )
    total_analyzed = analyzed_result.scalar() or 0
    
    # Average opportunity score
    avg_score_result = await session.execute(
        select(func.avg(ProblemInsight.opportunity_score))
        .join(DiscoveredProblem)
        .where(DiscoveredProblem.discovered_at >= start_date)
    )
    avg_opportunity_score = round(avg_score_result.scalar() or 0, 1)
    
    # Top categories
    category_result = await session.execute(
        select(
            ProblemInsight.category,
            func.count(ProblemInsight.id).label("count"),
            func.avg(ProblemInsight.opportunity_score).label("avg_score")
        )
        .join(DiscoveredProblem)
        .where(
            DiscoveredProblem.discovered_at >= start_date,
            ProblemInsight.category.isnot(None)
        )
        .group_by(ProblemInsight.category)
        .order_by(desc("count"))
        .limit(10)
    )
    top_categories = [
        CategoryTrend(
            category=row.category or "other",
            count=row.count,
            avg_score=round(row.avg_score or 0, 1)
        )
        for row in category_result
    ]
    
    # Platform breakdown
    platform_result = await session.execute(
        select(
            DiscoveredProblem.platform,
            func.count(DiscoveredProblem.id).label("count")
        )
        .where(DiscoveredProblem.discovered_at >= start_date)
        .group_by(DiscoveredProblem.platform)
        .order_by(desc("count"))
    )
    platform_breakdown = [
        PlatformTrend(platform=row.platform, count=row.count)
        for row in platform_result
    ]
    
    # Daily trend (problems discovered per day)
    daily_result = await session.execute(
        select(
            func.date(DiscoveredProblem.discovered_at).label("date"),
            func.count(DiscoveredProblem.id).label("count")
        )
        .where(DiscoveredProblem.discovered_at >= start_date)
        .group_by(func.date(DiscoveredProblem.discovered_at))
        .order_by("date")
    )
    daily_trend = [
        TrendPoint(date=str(row.date), count=row.count)
        for row in daily_result
    ]
    
    return TrendingSummary(
        total_problems=total_problems,
        total_analyzed=total_analyzed,
        avg_opportunity_score=avg_opportunity_score,
        top_categories=top_categories,
        platform_breakdown=platform_breakdown,
        daily_trend=daily_trend,
    )


@router.get("/trends/sparkline")
async def get_problem_sparkline(
    days: int = Query(14, ge=7, le=30),
    session: AsyncSession = Depends(get_session),
):
    """Get simple sparkline data for quick visualization."""
    start_date = datetime.now() - timedelta(days=days)
    
    # Get counts per day
    result = await session.execute(
        select(
            func.date(DiscoveredProblem.discovered_at).label("date"),
            func.count(DiscoveredProblem.id).label("count")
        )
        .where(DiscoveredProblem.discovered_at >= start_date)
        .group_by(func.date(DiscoveredProblem.discovered_at))
        .order_by("date")
    )
    
    # Fill in missing days with 0
    data = {str(row.date): row.count for row in result}
    sparkline = []
    
    for i in range(days):
        date = (datetime.now() - timedelta(days=days - 1 - i)).date()
        sparkline.append(data.get(str(date), 0))
    
    return {"sparkline": sparkline, "days": days}


@router.get("/trends/hot")
async def get_hot_problems(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
):
    """Get problems with highest opportunity scores in the last 7 days."""
    from sqlalchemy.orm import selectinload
    from backend_db.discovery_models import ProblemInsight
    
    week_ago = datetime.now() - timedelta(days=7)
    
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .join(ProblemInsight)
        .where(
            DiscoveredProblem.discovered_at >= week_ago,
            ProblemInsight.opportunity_score >= 7
        )
        .order_by(desc(ProblemInsight.opportunity_score))
        .limit(limit)
    )
    
    problems = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "title": p.title,
            "platform": p.platform,
            "opportunity_score": p.insight.opportunity_score if p.insight else None,
            "category": p.insight.category if p.insight else None,
            "problem_summary": p.insight.problem_summary if p.insight else None,
            "discovered_at": p.discovered_at.isoformat(),
        }
        for p in problems
    ]


# --- Multi-Source Validation Endpoints ---

class MultiSourceEnrichRequest(BaseModel):
    """Request for multi-source enrichment."""
    signal_types: Optional[List[str]] = Field(
        default=None,
        description="Signal types to fetch: jobs, news, social, developer, ecommerce"
    )
    limit_per_source: int = Field(default=20, ge=5, le=100)


class SignalResponse(BaseModel):
    """Individual market signal."""
    id: str
    source_type: str
    source_name: str
    title: str
    description: Optional[str]
    url: Optional[str]
    relevance_score: float
    volume: int
    velocity: float
    raw_data: dict
    fetched_at: datetime


class SignalsSummary(BaseModel):
    """Summary of all signals for a problem."""
    problem_id: str
    confidence_score: float
    total_signals: int
    by_type: dict
    top_sources: List[str]
    signals: List[SignalResponse]
    # AI Analysis fields
    ai_validation_summary: Optional[str] = None
    ai_confidence_score: Optional[int] = None
    ai_confidence_explanation: Optional[str] = None
    ai_market_validation: Optional[str] = None
    ai_key_insights: Optional[dict] = None
    ai_key_findings: Optional[List[str]] = None
    ai_red_flags: Optional[List[str]] = None
    ai_recommendations: Optional[List[str]] = None
    ai_next_steps: Optional[List[str]] = None
    ai_analyzed_at: Optional[str] = None


@router.post("/problems/{problem_id}/enrich-multi")
async def enrich_with_multi_source(
    problem_id: str,
    request: MultiSourceEnrichRequest = None,
    session: AsyncSession = Depends(get_session),
):
    """
    Run multi-source enrichment on a problem.
    
    Fetches signals from Jobs, News, Social Media, and other sources
    to validate the market opportunity.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Get the problem
    result = await session.execute(
        select(DiscoveredProblem).where(DiscoveredProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Import data providers
    try:
        from data_providers import DataProviderManager
        from data_providers.base import SignalType
        from data_providers.jobs import get_jobs_providers
        from data_providers.news import get_news_providers
        from data_providers.social import get_social_providers
        from data_providers.search import get_search_providers
        from data_providers.reviews import get_reviews_providers
        from data_providers.startups import get_startup_providers
        from data_providers.apify_client import get_apify_client
    except ImportError as e:
        logger.warning(f"Data providers not fully installed: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Data provider system not configured. Install apify-client."
        )
    
    # Check if Apify is configured
    client = get_apify_client()
    if not client.is_configured:
        raise HTTPException(
            status_code=400,
            detail="Apify API token not configured. Set APIFY_API_TOKEN in .env"
        )
    
    # Initialize provider manager
    manager = DataProviderManager()
    
    # Register all providers (Tier 1 + Tier 2)
    for provider in get_jobs_providers():
        manager.register(provider)
    for provider in get_news_providers():
        manager.register(provider)
    for provider in get_social_providers():
        manager.register(provider)
    for provider in get_search_providers():
        manager.register(provider)
    for provider in get_reviews_providers():
        manager.register(provider)
    for provider in get_startup_providers():
        manager.register(provider)

    
    # Determine which signal types to fetch
    signal_types = None
    if request and request.signal_types:
        signal_types = [SignalType(t) for t in request.signal_types if t in [e.value for e in SignalType]]
    
    # Build search query from problem title
    # Extract key terms (simple approach - first 5 words minus common words)
    stop_words = {"i", "me", "my", "the", "a", "an", "is", "are", "was", "were", "to", "for", "of", "with", "and", "or", "how", "what", "why", "when", "where", "who"}
    words = problem.title.lower().split()
    key_terms = [w for w in words if w not in stop_words][:5]
    query = " ".join(key_terms)
    
    logger.info(f"Running multi-source enrichment for problem: {problem.title[:50]}...")
    logger.info(f"Search query: {query}")
    
    # Fetch signals from all sources
    signals = await manager.fetch_all(
        query=query,
        signal_types=signal_types,
        limit=request.limit_per_source if request else 20,
    )
    
    logger.info(f"Fetched {len(signals)} signals from multi-source")
    
    # Import models for storage
    from backend_db.discovery_models import MarketSignal, MultiSourceValidation
    
    # Delete existing signals for this problem (refresh)
    await session.execute(
        select(MarketSignal).where(MarketSignal.problem_id == problem_id)
    )
    # Note: For now we'll add new signals without deleting old ones
    # A production system would want proper deduplication
    
    # Store signals in database
    stored_count = 0
    for signal_data in signals:
        signal = MarketSignal(
            problem_id=problem_id,
            source_type=signal_data.source_type.value,
            source_name=signal_data.source_name,
            query_used=signal_data.query_used,
            title=signal_data.title,
            description=signal_data.description,
            url=signal_data.url,
            relevance_score=signal_data.relevance_score,
            volume=signal_data.volume,
            velocity=signal_data.velocity,
            sentiment=signal_data.sentiment,
            raw_data=signal_data.raw_data,
            fetched_at=signal_data.fetched_at,
        )
        session.add(signal)
        stored_count += 1
    
    # Calculate and store aggregated validation
    summary = manager.summarize_signals(signals)
    
    # Check for existing validation record
    val_result = await session.execute(
        select(MultiSourceValidation).where(MultiSourceValidation.problem_id == problem_id)
    )
    validation = val_result.scalar_one_or_none()
    
    if validation:
        # Update existing
        validation.confidence_score = summary["confidence_score"]
        validation.total_signals = summary["total_signals"]
        validation.summary = summary["by_type"]
        validation.top_sources = list(set(s.source_name for s in signals))[:10]
        validation.updated_at = datetime.now()
        
        # Update per-type scores
        for signal_type, data in summary.get("by_type", {}).items():
            setattr(validation, f"{signal_type}_count", data.get("count", 0))
            setattr(validation, f"{signal_type}_score", data.get("avg_relevance", 0))
    else:
        # Create new
        validation = MultiSourceValidation(
            problem_id=problem_id,
            confidence_score=summary["confidence_score"],
            total_signals=summary["total_signals"],
            summary=summary["by_type"],
            top_sources=list(set(s.source_name for s in signals))[:10],
        )
        
        for signal_type, data in summary.get("by_type", {}).items():
            setattr(validation, f"{signal_type}_count", data.get("count", 0))
            setattr(validation, f"{signal_type}_score", data.get("avg_relevance", 0))
        
        session.add(validation)
    
    # Run AI analysis on the collected signals
    ai_analysis = None
    if signals:
        try:
            from backend_core.ai_enrichment import ai_enrichment
            
            # Convert signals to dict format for AI
            signals_for_ai = [
                {
                    "source_type": s.source_type.value if hasattr(s.source_type, 'value') else s.source_type,
                    "source_name": s.source_name,
                    "title": s.title,
                    "description": s.description or "",
                    "url": s.url or "",
                    "volume": s.volume,
                    "velocity": s.velocity,
                }
                for s in signals
            ]
            
            # Call Perplexity AI for signal analysis
            logger.info(f"Running Perplexity AI analysis on {len(signals_for_ai)} signals...")
            analysis = await ai_enrichment.analyze_market_signals(
                problem_title=problem.title,
                problem_summary=problem.title,  # Use title as summary if no summary available
                signals=signals_for_ai,
            )
            
            if analysis:
                logger.info(f"AI analysis complete. Confidence: {analysis.confidence_score}%")
                
                # Store AI analysis in validation record
                validation.ai_validation_summary = analysis.validation_summary
                validation.ai_confidence_score = analysis.confidence_score
                validation.ai_confidence_explanation = analysis.confidence_explanation
                validation.ai_market_validation = analysis.market_validation_score
                validation.ai_key_insights = {
                    "jobs": analysis.jobs_insights,
                    "news": analysis.news_insights,
                    "social": analysis.social_insights,
                }
                validation.ai_key_findings = analysis.key_findings
                validation.ai_red_flags = analysis.red_flags
                validation.ai_recommendations = analysis.recommendations
                validation.ai_next_steps = analysis.next_steps
                validation.ai_analyzed_at = datetime.now()
                validation.ai_model_used = analysis.model_used
                
                ai_analysis = analysis.to_dict()
            else:
                logger.warning("AI analysis returned None")
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            # Continue without AI analysis - signals are still stored
    
    await session.commit()
    
    return {
        "message": f"Multi-source enrichment complete",
        "problem_id": problem_id,
        "signals_fetched": len(signals),
        "signals_stored": stored_count,
        "confidence_score": summary["confidence_score"],
        "summary": summary["by_type"],
        "ai_analysis": ai_analysis,
    }


@router.get("/signals/{problem_id}", response_model=SignalsSummary)
async def get_problem_signals(
    problem_id: str,
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    """
    Get all market signals for a problem.
    
    Returns aggregated confidence score and individual signals
    from Jobs, News, Social Media, and other sources.
    """
    from backend_db.discovery_models import MarketSignal, MultiSourceValidation
    
    # Get the problem
    result = await session.execute(
        select(DiscoveredProblem).where(DiscoveredProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Get validation summary
    val_result = await session.execute(
        select(MultiSourceValidation).where(MultiSourceValidation.problem_id == problem_id)
    )
    validation = val_result.scalar_one_or_none()
    
    # Get signals
    signals_query = select(MarketSignal).where(MarketSignal.problem_id == problem_id)
    
    if source_type:
        signals_query = signals_query.where(MarketSignal.source_type == source_type)
    
    signals_query = signals_query.order_by(desc(MarketSignal.relevance_score)).limit(limit)
    
    signals_result = await session.execute(signals_query)
    signals = signals_result.scalars().all()
    
    # Build response
    signal_responses = [
        SignalResponse(
            id=s.id,
            source_type=s.source_type,
            source_name=s.source_name,
            title=s.title,
            description=s.description,
            url=s.url,
            relevance_score=s.relevance_score,
            volume=s.volume,
            velocity=s.velocity,
            raw_data=s.raw_data or {},
            fetched_at=s.fetched_at,
        )
        for s in signals
    ]
    
    # Build by_type summary
    by_type = {}
    if validation and validation.summary:
        by_type = validation.summary
    else:
        # Calculate from signals if no validation record
        for signal in signals:
            if signal.source_type not in by_type:
                by_type[signal.source_type] = {"count": 0, "total_volume": 0}
            by_type[signal.source_type]["count"] += 1
            by_type[signal.source_type]["total_volume"] += signal.volume
    
    return SignalsSummary(
        problem_id=problem_id,
        confidence_score=validation.confidence_score if validation else 0.0,
        total_signals=len(signals),
        by_type=by_type,
        top_sources=validation.top_sources if validation else [],
        signals=signal_responses,
        # AI Analysis fields
        ai_validation_summary=validation.ai_validation_summary if validation else None,
        ai_confidence_score=validation.ai_confidence_score if validation else None,
        ai_confidence_explanation=validation.ai_confidence_explanation if validation else None,
        ai_market_validation=validation.ai_market_validation if validation else None,
        ai_key_insights=validation.ai_key_insights if validation else None,
        ai_key_findings=validation.ai_key_findings if validation else None,
        ai_red_flags=validation.ai_red_flags if validation else None,
        ai_recommendations=validation.ai_recommendations if validation else None,
        ai_next_steps=validation.ai_next_steps if validation else None,
        ai_analyzed_at=validation.ai_analyzed_at.isoformat() if validation and validation.ai_analyzed_at else None,
    )


@router.get("/providers/status")
async def get_data_provider_status():
    """
    Get the status of data provider configuration.
    
    Returns info about Apify client, registered providers, and cache.
    """
    try:
        from data_providers.apify_client import get_apify_client
        from data_providers.jobs import get_jobs_providers
        from data_providers.news import get_news_providers
        from data_providers.social import get_social_providers
        
        client = get_apify_client()
        
        return {
            "apify_configured": client.is_configured,
            "apify_stats": client.get_stats(),
            "providers": {
                "jobs": [{"name": p.name, "description": p.description} for p in get_jobs_providers()],
                "news": [{"name": p.name, "description": p.description} for p in get_news_providers()],
                "social": [{"name": p.name, "description": p.description} for p in get_social_providers()],
            }
        }
    except ImportError as e:
        return {
            "apify_configured": False,
            "error": f"Data providers not installed: {e}",
            "providers": {},
        }
