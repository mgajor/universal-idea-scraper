from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from pydantic import BaseModel

from backend_db import get_session, Post, Comment

router = APIRouter(tags=["Data"])


# --- Schemas ---

class PostResponse(BaseModel):
    id: str
    subreddit: str
    title: str
    author: Optional[str]
    created_utc: Optional[datetime]
    permalink: str
    url: Optional[str]
    score: int
    upvote_ratio: float
    num_comments: int
    selftext: Optional[str]
    post_type: str
    is_nsfw: bool
    flair: Optional[str]
    has_media: bool
    sentiment_score: Optional[float]
    sentiment_label: Optional[str]
    scraped_at: datetime
    
    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    id: str
    post_id: str
    parent_id: Optional[str]
    author: Optional[str]
    body: str
    score: int
    created_utc: Optional[datetime]
    depth: int
    is_submitter: bool
    sentiment_score: Optional[float]
    sentiment_label: Optional[str]
    scraped_at: datetime
    
    class Config:
        from_attributes = True


class SearchResult(BaseModel):
    """Search result with context."""
    type: str  # "post" or "comment"
    id: str
    subreddit: Optional[str]
    title: Optional[str]
    body: str
    author: Optional[str]
    score: int
    created_utc: Optional[datetime]
    permalink: Optional[str]
    highlight: str  # Snippet with match


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    items: List
    total: int
    limit: int
    offset: int
    has_more: bool


# --- Posts Routes ---

@router.get("/posts", response_model=PaginatedResponse)
async def list_posts(
    subreddit: Optional[str] = Query(None, description="Filter by subreddit"),
    author: Optional[str] = Query(None, description="Filter by author"),
    post_type: Optional[str] = Query(None, description="Filter by post type"),
    min_score: Optional[int] = Query(None, description="Minimum score"),
    max_score: Optional[int] = Query(None, description="Maximum score"),
    has_media: Optional[bool] = Query(None, description="Has media"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    sort_by: str = Query("created_utc", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """List posts with filters and pagination."""
    query = select(Post)
    count_query = select(func.count()).select_from(Post)
    
    # Apply filters
    if subreddit:
        query = query.where(Post.subreddit.ilike(f"%{subreddit}%"))
        count_query = count_query.where(Post.subreddit.ilike(f"%{subreddit}%"))
    if author:
        query = query.where(Post.author == author)
        count_query = count_query.where(Post.author == author)
    if post_type:
        query = query.where(Post.post_type == post_type)
        count_query = count_query.where(Post.post_type == post_type)
    if min_score is not None:
        query = query.where(Post.score >= min_score)
        count_query = count_query.where(Post.score >= min_score)
    if max_score is not None:
        query = query.where(Post.score <= max_score)
        count_query = count_query.where(Post.score <= max_score)
    if has_media is not None:
        query = query.where(Post.has_media == has_media)
        count_query = count_query.where(Post.has_media == has_media)
    if start_date:
        query = query.where(Post.created_utc >= start_date)
        count_query = count_query.where(Post.created_utc >= start_date)
    if end_date:
        query = query.where(Post.created_utc <= end_date)
        count_query = count_query.where(Post.created_utc <= end_date)
    
    # Sorting
    sort_column = getattr(Post, sort_by, Post.created_utc)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    # Pagination
    query = query.limit(limit).offset(offset)
    
    # Execute
    result = await session.execute(query)
    posts = result.scalars().all()
    
    count_result = await session.execute(count_query)
    total = count_result.scalar() or 0
    
    return PaginatedResponse(
        items=[PostResponse.model_validate(p) for p in posts],
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a single post by ID."""
    result = await session.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    
    if not post:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Post not found")
    
    return PostResponse.model_validate(post)


# --- Comments Routes ---

@router.get("/comments", response_model=PaginatedResponse)
async def list_comments(
    post_id: Optional[str] = Query(None, description="Filter by post ID"),
    author: Optional[str] = Query(None, description="Filter by author"),
    min_score: Optional[int] = Query(None, description="Minimum score"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """List comments with filters and pagination."""
    query = select(Comment)
    count_query = select(func.count()).select_from(Comment)
    
    if post_id:
        query = query.where(Comment.post_id == post_id)
        count_query = count_query.where(Comment.post_id == post_id)
    if author:
        query = query.where(Comment.author == author)
        count_query = count_query.where(Comment.author == author)
    if min_score is not None:
        query = query.where(Comment.score >= min_score)
        count_query = count_query.where(Comment.score >= min_score)
    
    query = query.order_by(desc(Comment.score)).limit(limit).offset(offset)
    
    result = await session.execute(query)
    comments = result.scalars().all()
    
    count_result = await session.execute(count_query)
    total = count_result.scalar() or 0
    
    return PaginatedResponse(
        items=[CommentResponse.model_validate(c) for c in comments],
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


# --- Search ---

@router.get("/search", response_model=PaginatedResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    type: Optional[str] = Query(None, description="Filter by type: post, comment"),
    subreddit: Optional[str] = Query(None, description="Filter by subreddit"),
    min_score: Optional[int] = Query(None, description="Minimum score"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment: positive, neutral, negative"),
    has_media: Optional[bool] = Query(None, description="Has media (posts only)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """
    Full-text search across posts and comments.
    
    Searches in post titles, selftext, and comment bodies.
    """
    results = []
    total = 0
    
    # Search posts
    if type != "comment":
        post_query = select(Post).where(
            or_(
                Post.title.ilike(f"%{q}%"),
                Post.selftext.ilike(f"%{q}%"),
            )
        )
        
        if subreddit:
            post_query = post_query.where(Post.subreddit.ilike(f"%{subreddit}%"))
        if min_score is not None:
            post_query = post_query.where(Post.score >= min_score)
        if sentiment:
            post_query = post_query.where(Post.sentiment_label == sentiment)
        if has_media is not None:
            post_query = post_query.where(Post.has_media == has_media)
        
        post_query = post_query.order_by(desc(Post.score)).limit(limit).offset(offset)
        
        post_result = await session.execute(post_query)
        posts = post_result.scalars().all()
        
        for post in posts:
            # Create highlight snippet
            text = post.title + " " + (post.selftext or "")
            q_lower = q.lower()
            idx = text.lower().find(q_lower)
            if idx >= 0:
                start = max(0, idx - 50)
                end = min(len(text), idx + len(q) + 50)
                highlight = ("..." if start > 0 else "") + text[start:end] + ("..." if end < len(text) else "")
            else:
                highlight = text[:100] + "..."
            
            results.append(SearchResult(
                type="post",
                id=post.id,
                subreddit=post.subreddit,
                title=post.title,
                body=post.selftext or "",
                author=post.author,
                score=post.score,
                created_utc=post.created_utc,
                permalink=post.permalink,
                highlight=highlight,
            ))
    
    # Search comments
    if type != "post":
        comment_query = select(Comment).where(
            Comment.body.ilike(f"%{q}%")
        )
        
        if min_score is not None:
            comment_query = comment_query.where(Comment.score >= min_score)
        if sentiment:
            comment_query = comment_query.where(Comment.sentiment_label == sentiment)
        
        comment_query = comment_query.order_by(desc(Comment.score)).limit(limit).offset(offset)
        
        comment_result = await session.execute(comment_query)
        comments = comment_result.scalars().all()
        
        for comment in comments:
            # Create highlight snippet
            text = comment.body
            q_lower = q.lower()
            idx = text.lower().find(q_lower)
            if idx >= 0:
                start = max(0, idx - 50)
                end = min(len(text), idx + len(q) + 50)
                highlight = ("..." if start > 0 else "") + text[start:end] + ("..." if end < len(text) else "")
            else:
                highlight = text[:100] + "..."
            
            results.append(SearchResult(
                type="comment",
                id=comment.id,
                subreddit=None,
                title=None,
                body=comment.body,
                author=comment.author,
                score=comment.score,
                created_utc=comment.created_utc,
                permalink=None,
                highlight=highlight,
            ))
    
    # Sort by score and paginate
    results.sort(key=lambda x: x.score, reverse=True)
    total = len(results)
    
    return PaginatedResponse(
        items=results[offset:offset + limit],
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


# --- Subreddits ---

class SubredditStats(BaseModel):
    subreddit: str
    post_count: int
    comment_count: int
    total_score: int
    avg_score: float
    latest_post: Optional[datetime]


@router.get("/subreddits", response_model=List[SubredditStats])
async def list_subreddits(
    session: AsyncSession = Depends(get_session),
):
    """Get stats for all scraped subreddits."""
    query = select(
        Post.subreddit,
        func.count(Post.id).label("post_count"),
        func.sum(Post.score).label("total_score"),
        func.avg(Post.score).label("avg_score"),
        func.max(Post.created_utc).label("latest_post"),
    ).group_by(Post.subreddit).order_by(desc("post_count"))
    
    result = await session.execute(query)
    rows = result.all()
    
    stats = []
    for row in rows:
        # Get comment count for this subreddit
        comment_query = select(func.count()).select_from(Comment).join(
            Post, Comment.post_id == Post.id
        ).where(Post.subreddit == row.subreddit)
        comment_result = await session.execute(comment_query)
        comment_count = comment_result.scalar() or 0
        
        stats.append(SubredditStats(
            subreddit=row.subreddit,
            post_count=row.post_count,
            comment_count=comment_count,
            total_score=row.total_score or 0,
            avg_score=round(row.avg_score or 0, 2),
            latest_post=row.latest_post,
        ))
    
    return stats
