"""
Analytics API Routes

Comprehensive analytics endpoints for dashboard charts and metrics.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel

from backend_db import get_session
from backend_db.discovery_models import DiscoveredProblem, ProblemInsight, SearchJob

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# --- Schemas ---

class TimeSeriesPoint(BaseModel):
    date: str
    count: int
    analyzed: int = 0
    avg_score: float = 0


class PlatformStats(BaseModel):
    platform: str
    total: int
    analyzed: int
    avg_score: float
    high_potential: int  # 7+ score


class CategoryStats(BaseModel):
    category: str
    count: int
    avg_score: float


class ScoreDistribution(BaseModel):
    score: int
    count: int


class OverviewStats(BaseModel):
    total_problems: int
    total_analyzed: int
    total_saved: int
    total_high_potential: int
    avg_score: float
    problems_today: int
    problems_this_week: int


class DashboardData(BaseModel):
    overview: OverviewStats
    time_series: List[TimeSeriesPoint]
    platform_stats: List[PlatformStats]
    category_stats: List[CategoryStats]
    score_distribution: List[ScoreDistribution]
    recent_high_value: List[dict]


# --- Routes ---

@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    days: int = Query(30, ge=7, le=90, description="Days to analyze"),
    session: AsyncSession = Depends(get_session),
):
    """Get comprehensive dashboard analytics data."""
    from sqlalchemy.orm import selectinload
    
    now = datetime.now()
    cutoff = now - timedelta(days=days)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Fetch all problems with insights
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(
            DiscoveredProblem.discovered_at >= cutoff,
            DiscoveredProblem.is_hidden == False,
        )
    )
    problems = result.scalars().all()
    
    # --- Overview Stats ---
    analyzed = [p for p in problems if p.insight]
    saved = [p for p in problems if p.is_saved]
    high_potential = [p for p in analyzed if p.insight.opportunity_score >= 7]
    
    avg_score = sum(p.insight.opportunity_score for p in analyzed) / len(analyzed) if analyzed else 0
    problems_today = len([p for p in problems if p.discovered_at and p.discovered_at >= today_start])
    problems_week = len([p for p in problems if p.discovered_at and p.discovered_at >= week_start])
    
    overview = OverviewStats(
        total_problems=len(problems),
        total_analyzed=len(analyzed),
        total_saved=len(saved),
        total_high_potential=len(high_potential),
        avg_score=round(avg_score, 2),
        problems_today=problems_today,
        problems_this_week=problems_week,
    )
    
    # --- Time Series ---
    time_series = []
    for i in range(days):
        date = (now - timedelta(days=days - 1 - i)).date()
        day_start = datetime.combine(date, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        
        day_problems = [p for p in problems if p.discovered_at and day_start <= p.discovered_at < day_end]
        day_analyzed = [p for p in day_problems if p.insight]
        day_avg = sum(p.insight.opportunity_score for p in day_analyzed) / len(day_analyzed) if day_analyzed else 0
        
        time_series.append(TimeSeriesPoint(
            date=date.isoformat(),
            count=len(day_problems),
            analyzed=len(day_analyzed),
            avg_score=round(day_avg, 2),
        ))
    
    # --- Platform Stats ---
    platform_data = {}
    for p in problems:
        if p.platform not in platform_data:
            platform_data[p.platform] = {"total": 0, "analyzed": 0, "scores": [], "high": 0}
        platform_data[p.platform]["total"] += 1
        if p.insight:
            platform_data[p.platform]["analyzed"] += 1
            platform_data[p.platform]["scores"].append(p.insight.opportunity_score)
            if p.insight.opportunity_score >= 7:
                platform_data[p.platform]["high"] += 1
    
    platform_stats = [
        PlatformStats(
            platform=platform,
            total=data["total"],
            analyzed=data["analyzed"],
            avg_score=round(sum(data["scores"]) / len(data["scores"]), 2) if data["scores"] else 0,
            high_potential=data["high"],
        )
        for platform, data in sorted(platform_data.items(), key=lambda x: -x[1]["total"])
    ]
    
    # --- Category Stats ---
    category_data = {}
    for p in analyzed:
        cat = p.insight.category or "uncategorized"
        if cat not in category_data:
            category_data[cat] = {"count": 0, "scores": []}
        category_data[cat]["count"] += 1
        category_data[cat]["scores"].append(p.insight.opportunity_score)
    
    category_stats = [
        CategoryStats(
            category=cat,
            count=data["count"],
            avg_score=round(sum(data["scores"]) / len(data["scores"]), 2) if data["scores"] else 0,
        )
        for cat, data in sorted(category_data.items(), key=lambda x: -x[1]["count"])[:10]
    ]
    
    # --- Score Distribution ---
    score_counts = {i: 0 for i in range(1, 11)}
    for p in analyzed:
        score = p.insight.opportunity_score
        if 1 <= score <= 10:
            score_counts[score] += 1
    
    score_distribution = [
        ScoreDistribution(score=score, count=count)
        for score, count in score_counts.items()
    ]
    
    # --- Recent High Value Problems ---
    recent_high = sorted(
        [p for p in analyzed if p.insight.opportunity_score >= 7],
        key=lambda x: x.discovered_at if x.discovered_at else datetime.min,
        reverse=True
    )[:5]
    
    recent_high_value = [
        {
            "id": p.id,
            "title": p.title,
            "platform": p.platform,
            "score": p.insight.opportunity_score,
            "category": p.insight.category,
            "discovered_at": p.discovered_at.isoformat() if p.discovered_at else None,
        }
        for p in recent_high
    ]
    
    return DashboardData(
        overview=overview,
        time_series=time_series,
        platform_stats=platform_stats,
        category_stats=category_stats,
        score_distribution=score_distribution,
        recent_high_value=recent_high_value,
    )


@router.get("/platform-comparison")
async def get_platform_comparison(
    days: int = Query(14, ge=7, le=30),
    session: AsyncSession = Depends(get_session),
):
    """Get platform comparison data for stacked charts - OPTIMIZED to single query."""
    from sqlalchemy import cast, Date
    
    now = datetime.now()
    cutoff = now - timedelta(days=days)
    
    # Single optimized query with GROUP BY instead of N*M separate queries
    result = await session.execute(
        select(
            cast(DiscoveredProblem.discovered_at, Date).label("date"),
            DiscoveredProblem.platform,
            func.count(DiscoveredProblem.id).label("count")
        )
        .where(
            DiscoveredProblem.discovered_at >= cutoff,
            DiscoveredProblem.is_hidden == False,
        )
        .group_by(
            cast(DiscoveredProblem.discovered_at, Date),
            DiscoveredProblem.platform
        )
    )
    rows = result.all()
    
    # Build platform list and date->platform->count mapping
    platforms = ["reddit", "hackernews", "producthunt", "indiehackers", "quora"]
    counts = {}
    for row in rows:
        date_str = row.date.isoformat() if row.date else None
        if date_str:
            if date_str not in counts:
                counts[date_str] = {}
            counts[date_str][row.platform] = row.count
    
    # Build result data for all days
    result_data = []
    for i in range(days):
        date = (now - timedelta(days=days - 1 - i)).date()
        date_str = date.isoformat()
        day_data = {"date": date_str}
        for platform in platforms:
            day_data[platform] = counts.get(date_str, {}).get(platform, 0)
        result_data.append(day_data)
    
    return result_data


@router.get("/score-trends")
async def get_score_trends(
    days: int = Query(14, ge=7, le=30),
    session: AsyncSession = Depends(get_session),
):
    """Get average score trends over time."""
    from sqlalchemy.orm import selectinload
    
    now = datetime.now()
    cutoff = now - timedelta(days=days)
    
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(
            DiscoveredProblem.discovered_at >= cutoff,
            DiscoveredProblem.is_hidden == False,
        )
    )
    problems = result.scalars().all()
    
    trend_data = []
    for i in range(days):
        date = (now - timedelta(days=days - 1 - i)).date()
        day_start = datetime.combine(date, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        
        day_analyzed = [
            p for p in problems 
            if p.insight and p.discovered_at and day_start <= p.discovered_at < day_end
        ]
        
        if day_analyzed:
            avg_score = sum(p.insight.opportunity_score for p in day_analyzed) / len(day_analyzed)
            max_score = max(p.insight.opportunity_score for p in day_analyzed)
            min_score = min(p.insight.opportunity_score for p in day_analyzed)
        else:
            avg_score = max_score = min_score = 0
        
        trend_data.append({
            "date": date.isoformat(),
            "avg": round(avg_score, 2),
            "max": max_score,
            "min": min_score,
            "count": len(day_analyzed),
        })
    
    
    return trend_data


@router.get("/activity", response_model=List[dict])
async def get_activity_data(
    days: int = Query(7, ge=7, le=90),
    session: AsyncSession = Depends(get_session),
):
    """Get daily activity volume (posts & comments)."""
    from sqlalchemy import cast, Date, union_all, literal
    from backend_db.models import Post, Comment
    
    now = datetime.now()
    cutoff = now - timedelta(days=days)
    
    # Efficient daily aggregation using checking scraped_at/created_utc
    # We use scraped_at for operations visibility
    
    # --- Activity Endpoint (Merged) ---
    
    # Posts per day
    posts_query = (
        select(
            cast(Post.scraped_at, Date).label("date"),
            func.count(Post.id).label("count")
        )
        .where(Post.scraped_at >= cutoff)
        .group_by(cast(Post.scraped_at, Date))
    )
    
    # Comments per day
    comments_query = (
        select(
            cast(Comment.scraped_at, Date).label("date"),
            func.count(Comment.id).label("count")
        )
        .where(Comment.scraped_at >= cutoff)
        .group_by(cast(Comment.scraped_at, Date))
    )
    
    # Problems per day (NEW)
    problems_query = (
         select(
            cast(DiscoveredProblem.discovered_at, Date).label("date"),
            func.count(DiscoveredProblem.id).label("count")
        )
        .where(DiscoveredProblem.discovered_at >= cutoff)
        .group_by(cast(DiscoveredProblem.discovered_at, Date))
    )
    
    # Execute queries
    posts_res = await session.execute(posts_query)
    comments_res = await session.execute(comments_query)
    problems_res = await session.execute(problems_query)
    
    # Process results
    activity_map = {}
    
    # Initialize days
    for i in range(days):
        date = (now - timedelta(days=days - 1 - i)).date()
        date_str = date.isoformat()
        activity_map[date_str] = {
            "name": date.strftime("%a"),  # Mon, Tue
            "full_date": date_str,
            "posts": 0,
            "comments": 0
        }
        
    # Fill data
    for row in posts_res:
        date_str = row.date.isoformat() if row.date else None
        if date_str and date_str in activity_map:
            activity_map[date_str]["posts"] += row.count
            
    for row in comments_res:
        date_str = row.date.isoformat() if row.date else None
        if date_str and date_str in activity_map:
            activity_map[date_str]["comments"] += row.count
            
    # Add problems to "posts" count for visibility
    for row in problems_res:
        date_str = row.date.isoformat() if row.date else None
        if date_str and date_str in activity_map:
            activity_map[date_str]["posts"] += row.count
            
    return list(activity_map.values())


# --- Raw Data Analytics (Merged) ---

@router.get("/overview")
async def get_raw_overview(session: AsyncSession = Depends(get_session)):
    """Get overview of raw scraped data (posts + problems, comments)."""
    from backend_db.models import Post, Comment
    
    total_posts = await session.scalar(select(func.count(Post.id)))
    total_comments = await session.scalar(select(func.count(Comment.id)))
    total_problems = await session.scalar(select(func.count(DiscoveredProblem.id)))
    total_subreddits = await session.scalar(select(func.count(func.distinct(Post.subreddit))))
    
    # Avg scores
    avg_score = await session.scalar(select(func.avg(Post.score)))
    
    # Today stats (Posts + Problems)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    posts_today = await session.scalar(select(func.count(Post.id)).where(Post.scraped_at >= today_start))
    problems_today = await session.scalar(select(func.count(DiscoveredProblem.id)).where(DiscoveredProblem.discovered_at >= today_start))
    
    week_start = today_start - timedelta(days=7)
    posts_week = await session.scalar(select(func.count(Post.id)).where(Post.scraped_at >= week_start))
    problems_week = await session.scalar(select(func.count(DiscoveredProblem.id)).where(DiscoveredProblem.discovered_at >= week_start))

    return {
        "total_posts": (total_posts or 0) + (total_problems or 0),
        "total_comments": total_comments or 0,
        "total_subreddits": total_subreddits or 0,
        "total_score": 0, 
        "avg_score": round(avg_score or 0, 2),
        "posts_today": (posts_today or 0) + (problems_today or 0),
        "posts_this_week": (posts_week or 0) + (problems_week or 0)
    }


@router.get("/timeseries")
async def get_raw_timeseries(
    days: int = Query(30, ge=7, le=90),
    session: AsyncSession = Depends(get_session)
):
    """Get raw posts + problems volume over time."""
    from backend_db.models import Post
    from sqlalchemy import cast, Date
    
    now = datetime.now()
    cutoff = now - timedelta(days=days)
    
    # Posts
    query_p = (
        select(
            cast(Post.scraped_at, Date).label("date"),
            func.count(Post.id).label("count")
        )
        .where(Post.scraped_at >= cutoff)
        .group_by(cast(Post.scraped_at, Date))
    )
    
    # Problems
    query_d = (
         select(
            cast(DiscoveredProblem.discovered_at, Date).label("date"),
            func.count(DiscoveredProblem.id).label("count")
        )
        .where(DiscoveredProblem.discovered_at >= cutoff)
        .group_by(cast(DiscoveredProblem.discovered_at, Date))
    )
    
    res_p = await session.execute(query_p)
    res_d = await session.execute(query_d)
    
    # Merge
    counts = {}
    for row in res_p:
        d = row.date.isoformat()
        counts[d] = counts.get(d, 0) + row.count
        
    for row in res_d:
        d = row.date.isoformat()
        counts[d] = counts.get(d, 0) + row.count
    
    output = []
    for i in range(days):
        date = (now - timedelta(days=days - 1 - i)).date()
        date_str = date.isoformat()
        output.append({
            "date": date_str,
            "posts": counts.get(date_str, 0),
            "comments": 0,
            "total_score": 0
        })
        
    return output


@router.get("/distributions/post_types")
async def get_post_type_distribution(session: AsyncSession = Depends(get_session)):
    """Get distribution of post types."""
    from backend_db.models import Post
    
    query = (
        select(
            Post.post_type,
            func.count(Post.id).label("count")
        )
        .group_by(Post.post_type)
        .order_by(desc("count"))
    )
    
    result = await session.execute(query)
    return [{"label": row.post_type or "unknown", "count": row.count} for row in result.all()]


@router.get("/top_keywords")
async def get_top_keywords(
    limit: int = 20,
    session: AsyncSession = Depends(get_session)
):
    """Get top keywords from posts."""
    # Note: This is an expensive operation on JSON arrays.
    # Ideally should be pre-aggregated. For MVP, we'll try to aggregate recently scraped.
    from backend_db.models import Post
    
    # Simple check if using Postgres, we can use jsonb_array_elements
    # But since we use JSON type that maps to Text in SQLite or JSON/JSONB in PG, 
    # we might need a simpler approach if database specific functions aren't reliable cross-DB.
    # Assuming PG for this project.
    
    # Using SQLA logic for PG: select key, count(*) from posts, json_array_elements_text(keywords) as key group by key
    
    # Fallback/Safe: Return placeholder or analyze recent 100 posts in python if complexity is high
    # Let's try native PG query for speed
    try:
        stmt = select(
            func.jsonb_array_elements_text(Post.keywords).label("keyword"),
            func.count(Post.id).label("count")
        ).group_by("keyword").order_by(desc("count")).limit(limit)
        
        result = await session.execute(stmt)
        return [{"keyword": row.keyword, "count": row.count} for row in result.all()]
    except Exception:
        # Fallback if function doesn't exist (e.g. SQLite tests) or other error
        return []


@router.get("/distributions/sentiment")
async def get_sentiment_distribution(session: AsyncSession = Depends(get_session)):
    """Get distribution of sentiment labels."""
    from backend_db.models import Post
    
    query = (
        select(
            Post.sentiment_label,
            func.count(Post.id).label("count")
        )
        .group_by(Post.sentiment_label)
        .order_by(desc("count"))
    )
    
    result = await session.execute(query)
    return [{"label": row.sentiment_label or "unknown", "count": row.count} for row in result.all()]


@router.get("/distributions/score")
async def get_score_distribution(session: AsyncSession = Depends(get_session)):
    """Get distribution of scores (bucketing)."""
    from backend_db.models import Post
    from sqlalchemy import case
    
    # Simple bucketing: <10, 10-50, 50-100, 100-500, 500+
    # We can do this in python for simplicity or huge case statement in SQL
    # Python is easier for flexible buckets
    
    result = await session.execute(select(Post.score))
    scores = result.scalars().all()
    
    buckets = {
        "< 10": 0,
        "10 - 50": 0,
        "50 - 100": 0,
        "100 - 500": 0,
        "500+": 0
    }
    
    for s in scores:
        if s < 10: buckets["< 10"] += 1
        elif s < 50: buckets["10 - 50"] += 1
        elif s < 100: buckets["50 - 100"] += 1
        elif s < 500: buckets["100 - 500"] += 1
        else: buckets["500+"] += 1
        
    return [{"label": k, "count": v} for k, v in buckets.items()]


@router.get("/top_authors")
async def get_top_authors(
    limit: int = 10,
    session: AsyncSession = Depends(get_session)
):
    """Get top authors by post count."""
    from backend_db.models import Post
    
    query = (
        select(
            Post.author,
            func.count(Post.id).label("post_count"),
            func.sum(Post.score).label("total_score"),
            func.avg(Post.score).label("avg_score")
        )
        .where(Post.author != None)
        .group_by(Post.author)
        .order_by(desc("post_count"))
        .limit(limit)
    )
    
    result = await session.execute(query)
    return [
        {
            "author": row.author,
            "post_count": row.post_count,
            "total_score": row.total_score or 0,
            "avg_score": round(row.avg_score or 0, 2)
        }
        for row in result.all()
    ]


