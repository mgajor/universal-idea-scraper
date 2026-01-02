#!/usr/bin/env python3
"""
Convert scraped posts into Discovered Problems for Command Center display.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime
import uuid

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend_db import init_db, get_session_context, Post
from backend_db.discovery_models import DiscoveredProblem, ProblemInsight


async def convert_posts_to_problems() -> int:
    """Convert all scraped posts to discovered problems."""
    
    # Initialize database
    await init_db()
    print("[OK] Database initialized")
    
    count = 0
    async with get_session_context() as session:
        # Get all posts
        from sqlalchemy import select
        result = await session.execute(select(Post).order_by(Post.created_utc.desc()))
        posts = result.scalars().all()
        
        print(f"[INFO] Found {len(posts)} posts to convert")
        
        for post in posts:
            try:
                # Create URL (Reddit permalink to full URL)
                url = f"https://www.reddit.com{post.permalink}" if post.permalink.startswith("/") else post.permalink
                
                # Check if already exists
                existing = await session.execute(
                    select(DiscoveredProblem).where(DiscoveredProblem.url == url)
                )
                if existing.scalar_one_or_none():
                    continue
                
                # Create DiscoveredProblem
                problem = DiscoveredProblem(
                    id=str(uuid.uuid4()),
                    search_job_id=None,  # Not from a search job
                    url=url,
                    title=post.title[:512] if post.title else "Untitled",
                    snippet=post.selftext[:500] if post.selftext else None,
                    platform="reddit",
                    keyword_matched=f"r/{post.subreddit}",
                    upvotes=post.score,
                    comments_count=post.num_comments,
                    is_saved=False,
                    is_hidden=False,
                    discovered_at=post.scraped_at or datetime.now(),
                    source_date=post.created_utc,
                )
                
                session.add(problem)
                count += 1
                
                # Also create a basic insight with a random score for visualization
                import random
                insight = ProblemInsight(
                    id=str(uuid.uuid4()),
                    problem_id=problem.id,
                    category=categorize_post(post.title, post.subreddit),
                    problem_summary=post.selftext[:300] if post.selftext else post.title[:200],
                    job_to_be_done=generate_jtbd(post.title),
                    opportunity_score=calculate_score(post.score, post.num_comments),
                    score_reasoning=f"Based on {post.score} upvotes and {post.num_comments} comments from r/{post.subreddit}",
                    demand_signals=[f"High engagement in r/{post.subreddit}"] if post.score > 5 else [],
                    competitors=[],
                    market_gaps=[],
                    improvement_opportunities=[],
                    target_audience=f"Users of r/{post.subreddit}",
                    analyzed_at=datetime.now(),
                    model_used="auto-generated",
                )
                
                session.add(insight)
                
            except Exception as e:
                print(f"  [WARN] Error converting post {post.id}: {e}")
                continue
        
        await session.commit()
    
    return count


def categorize_post(title: str, subreddit: str) -> str:
    """Categorize a post based on title and subreddit."""
    title_lower = title.lower()
    
    if "productivity" in subreddit.lower() or "productivity" in title_lower:
        return "Productivity"
    elif "saas" in subreddit.lower() or "saas" in title_lower:
        if "micro" in title_lower:
            return "Micro-SaaS"
        return "SaaS"
    elif "app" in title_lower or "tool" in title_lower:
        return "Tools"
    elif "ai" in title_lower or "gpt" in title_lower:
        return "AI/ML"
    elif "startup" in title_lower or "business" in title_lower:
        return "Business"
    elif "automation" in title_lower:
        return "Automation"
    else:
        return "General"


def generate_jtbd(title: str) -> str:
    """Generate a Jobs-To-Be-Done statement from title."""
    # Simple extraction of action verbs/goals from title
    title = title[:200]
    if "?" in title:
        return f"Users seeking solutions: {title}"
    elif "how to" in title.lower():
        return f"Users want to learn: {title}"
    else:
        return f"Users are discussing: {title}"


def calculate_score(upvotes: int, comments: int) -> int:
    """Calculate opportunity score based on engagement."""
    engagement = upvotes + (comments * 2)
    
    if engagement > 50:
        return min(10, 7 + (engagement // 50))
    elif engagement > 20:
        return 6
    elif engagement > 10:
        return 5
    elif engagement > 5:
        return 4
    else:
        return 3


async def main():
    print("=" * 50)
    print("Converting Posts to Discovered Problems")
    print("=" * 50)
    
    count = await convert_posts_to_problems()
    
    print(f"\n{'=' * 50}")
    print(f"[DONE] Converted {count} posts to discovered problems")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
