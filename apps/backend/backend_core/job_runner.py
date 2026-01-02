import asyncio
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
import traceback

# Add parent paths for scraper imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from backend_db import JobRun, JobLog, JobStatus, Post, get_session_context


class EventType(str, Enum):
    """Event types emitted during job execution."""
    STARTED = "started"
    PROGRESS = "progress"
    LOG = "log"
    METRICS = "metrics"
    CHECKPOINT = "checkpoint"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class JobEvent:
    """Event emitted during job execution."""
    type: EventType
    run_id: str
    timestamp: datetime = field(default_factory=datetime.now)
    message: str = ""
    data: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "run_id": self.run_id,
            "timestamp": self.timestamp.isoformat(),
            "message": self.message,
            "data": self.data,
        }


class JobRunner:
    """
    Executes scraping jobs with real-time event emission.
    Wraps the existing scraper module for compatibility.
    """
    
    def __init__(self):
        self._cancelled = {}  # run_id -> bool
        self._running = {}    # run_id -> asyncio.Task
    
    def cancel(self, run_id: str):
        """Cancel a running job."""
        self._cancelled[run_id] = True
    
    def is_cancelled(self, run_id: str) -> bool:
        """Check if job is cancelled."""
        return self._cancelled.get(run_id, False)
    
    async def _save_posts_to_db(self, posts: list, run_id: str, subreddit: str) -> int:
        """Save posts to database, returning count of new posts."""
        if not posts:
            return 0
        
        new_count = 0
        try:
            async with get_session_context() as session:
                for post_data in posts:
                    # Parse created_utc if string
                    created_utc = post_data.get("created_utc")
                    if isinstance(created_utc, str):
                        try:
                            from dateutil import parser
                            created_utc = parser.parse(created_utc)
                        except:
                            created_utc = None
                    elif isinstance(created_utc, (int, float)):
                        created_utc = datetime.fromtimestamp(created_utc)
                    
                    # Create Post object
                    post = Post(
                        id=post_data.get("id", "")[:20],
                        subreddit=subreddit[:100],
                        title=post_data.get("title", "")[:500] if post_data.get("title") else "Untitled",
                        author=post_data.get("author", "")[:100] if post_data.get("author") else None,
                        created_utc=created_utc,
                        permalink=post_data.get("permalink", "")[:500],
                        url=post_data.get("url"),
                        score=int(post_data.get("score", 0)),
                        upvote_ratio=float(post_data.get("upvote_ratio", 0)),
                        num_comments=int(post_data.get("num_comments", 0)),
                        num_crossposts=int(post_data.get("num_crossposts", 0)),
                        selftext=post_data.get("selftext"),
                        post_type=post_data.get("post_type", "text")[:20],
                        is_nsfw=bool(post_data.get("is_nsfw", False)),
                        is_spoiler=bool(post_data.get("is_spoiler", False)),
                        flair=post_data.get("flair", "")[:100] if post_data.get("flair") else None,
                        total_awards=int(post_data.get("total_awards", 0)),
                        has_media=bool(post_data.get("has_media", False)),
                        media_downloaded=bool(post_data.get("media_downloaded", False)),
                        source=post_data.get("source", "scraper")[:50],
                        run_id=run_id,
                    )
                    
                    # Use merge to handle duplicates (upsert behavior)
                    await session.merge(post)
                    new_count += 1
                
                await session.commit()
        except Exception as e:
            print(f"[DB] Error saving posts: {e}")
        
        return new_count
    
    async def run(
        self,
        run_id: str,
        target: str,
        mode: str = "full",
        limit: int = 100,
        is_user: bool = False,
        download_media: bool = True,
        scrape_comments: bool = True,
        use_plugins: bool = False,
    ) -> AsyncGenerator[JobEvent, None]:
        """
        Execute a scraping job with event streaming.
        
        Yields JobEvent objects as the job progresses.
        """
        self._cancelled[run_id] = False
        start_time = time.time()
        
        # Emit start event
        yield JobEvent(
            type=EventType.STARTED,
            run_id=run_id,
            message=f"Starting scrape for {'u/' if is_user else 'r/'}{target}",
            data={
                "target": target,
                "mode": mode,
                "limit": limit,
                "is_user": is_user,
            }
        )
        
        try:
            # Import scraper (lazy to avoid circular imports)
            from scraper.async_scraper import (
                fetch_posts_page, extract_post_data, extract_media_urls,
                download_media_async, fetch_comments_async, parse_comments_sync
            )
            # Import scraper settings from project root config
            from config import USER_AGENT, ASYNC_MAX_CONCURRENT
            from backend_core.reddit_auth import reddit_auth
            import aiohttp
            import random
            import os
            
            # Setup directories
            prefix = "u" if is_user else "r"
            base_dir = Path(f"data/{prefix}_{target}")
            media_dir = base_dir / "media"
            images_dir = media_dir / "images"
            videos_dir = media_dir / "videos"
            
            for d in [base_dir, media_dir, images_dir, videos_dir]:
                d.mkdir(parents=True, exist_ok=True)
            
            # Track progress
            all_posts = []
            all_comments = []
            total_fetched = 0
            seen_permalinks = set()
            
            semaphore = asyncio.Semaphore(ASYNC_MAX_CONCURRENT)
            
            # Get OAuth headers
            auth_headers = await reddit_auth.get_session_headers()
            api_base = reddit_auth.get_api_base()
            
            print(f"[DEBUG] Using API base: {api_base}")
            print(f"[DEBUG] OAuth configured: {reddit_auth.is_configured}")
            
            async with aiohttp.ClientSession(headers=auth_headers) as session:
                after = None
                
                while total_fetched < limit:
                    # Check cancellation
                    if self.is_cancelled(run_id):
                        yield JobEvent(
                            type=EventType.CANCELLED,
                            run_id=run_id,
                            message="Job cancelled by user",
                        )
                        return
                    
                    # Build API URL (using OAuth endpoint)
                    batch_size = min(100, limit - total_fetched)
                    if is_user:
                        path = f"/user/{target}/submitted.json"
                    else:
                        path = f"/r/{target}/new.json"
                    
                    url = f"{api_base}{path}?limit={batch_size}&raw_json=1"
                    if after:
                        url += f"&after={after}"
                    
                    print(f"[DEBUG] Trying: {url}")
                    
                    data = None
                    try:
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                            print(f"[DEBUG] Response status: {response.status}")
                            if response.status == 200:
                                data = await response.json()
                                children_count = len(data.get("data", {}).get("children", []))
                                print(f"[DEBUG] Got {children_count} posts")
                                
                                yield JobEvent(
                                    type=EventType.LOG,
                                    run_id=run_id,
                                    message=f"Fetched {children_count} posts from Reddit API",
                                    data={"level": "INFO"}
                                )
                            elif response.status == 403:
                                # Need OAuth credentials
                                error_text = await response.text()
                                print(f"[DEBUG] 403 Forbidden - likely need OAuth credentials")
                                yield JobEvent(
                                    type=EventType.FAILED,
                                    run_id=run_id,
                                    message="Reddit API requires OAuth. Please configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env",
                                    data={"error": "OAuth credentials required", "status": 403}
                                )
                                return
                            else:
                                print(f"[DEBUG] Non-200 status: {response.status}")
                                error_text = await response.text()
                                print(f"[DEBUG] Response: {error_text[:200]}")
                    except Exception as e:
                        print(f"[DEBUG] API exception: {e}")
                        yield JobEvent(
                            type=EventType.LOG,
                            run_id=run_id,
                            message=f"API request failed: {str(e)}",
                            data={"level": "ERROR"}
                        )
                    
                    if not data:
                        yield JobEvent(
                            type=EventType.LOG,
                            run_id=run_id,
                            message="All mirrors failed",
                            data={"level": "ERROR"}
                        )
                        break
                    
                    children = data.get("data", {}).get("children", [])
                    if not children:
                        yield JobEvent(
                            type=EventType.LOG,
                            run_id=run_id,
                            message="No more posts available",
                            data={"level": "INFO"}
                        )
                        break
                    
                    # Process posts
                    batch_posts = []
                    for child in children:
                        if self.is_cancelled(run_id):
                            break
                        
                        p = child["data"]
                        post = extract_post_data(p)
                        
                        if post["permalink"] in seen_permalinks:
                            continue
                        
                        seen_permalinks.add(post["permalink"])
                        batch_posts.append(post)
                        
                        # Download media if enabled
                        if download_media:
                            media = extract_media_urls(p)
                            media_count = len(media.get("images", [])) + len(media.get("videos", []))
                            if media_count > 0:
                                # Queue media downloads (simplified for now)
                                pass
                    
                    all_posts.extend(batch_posts)
                    total_fetched += len(batch_posts)
                    
                    # Save to database
                    saved_count = await self._save_posts_to_db(batch_posts, run_id, target)
                    print(f"[DB] Saved {saved_count} posts to database")
                    
                    # Emit progress
                    progress_percent = min(100, int((total_fetched / limit) * 100))
                    elapsed = time.time() - start_time
                    items_per_min = (total_fetched / elapsed) * 60 if elapsed > 0 else 0
                    eta = int((limit - total_fetched) / (items_per_min / 60)) if items_per_min > 0 else 0
                    
                    yield JobEvent(
                        type=EventType.PROGRESS,
                        run_id=run_id,
                        message=f"Scraped {total_fetched}/{limit} posts",
                        data={
                            "progress_percent": progress_percent,
                            "posts_scraped": total_fetched,
                            "items_per_minute": round(items_per_min, 1),
                            "eta_seconds": eta,
                        }
                    )
                    
                    # Emit metrics periodically
                    yield JobEvent(
                        type=EventType.METRICS,
                        run_id=run_id,
                        message="",
                        data={
                            "posts_scraped": total_fetched,
                            "comments_scraped": len(all_comments),
                            "media_downloaded": 0,  # TODO: track media
                            "elapsed_seconds": round(elapsed, 1),
                        }
                    )
                    
                    # Get next page token
                    after = data.get("data", {}).get("after")
                    if not after:
                        break
                    
                    # Small delay between batches
                    await asyncio.sleep(1)
            
            # Save results to CSV (using existing format for compatibility)
            if all_posts:
                import pandas as pd
                posts_file = base_dir / "posts.csv"
                df = pd.DataFrame(all_posts)
                if posts_file.exists():
                    df.to_csv(posts_file, mode='a', header=False, index=False)
                else:
                    df.to_csv(posts_file, index=False)
                
                yield JobEvent(
                    type=EventType.LOG,
                    run_id=run_id,
                    message=f"Saved {len(all_posts)} posts to {posts_file}",
                    data={"level": "INFO"}
                )
            
            # Calculate final duration
            duration = time.time() - start_time
            
            # Emit completion
            yield JobEvent(
                type=EventType.COMPLETED,
                run_id=run_id,
                message=f"Completed scrape: {total_fetched} posts in {duration:.1f}s",
                data={
                    "posts_scraped": total_fetched,
                    "comments_scraped": len(all_comments),
                    "media_downloaded": 0,
                    "duration_seconds": round(duration, 1),
                }
            )
            
        except Exception as e:
            yield JobEvent(
                type=EventType.FAILED,
                run_id=run_id,
                message=f"Job failed: {str(e)}",
                data={
                    "error": str(e),
                    "traceback": traceback.format_exc(),
                }
            )
        finally:
            # Cleanup
            self._cancelled.pop(run_id, None)
            self._running.pop(run_id, None)


# Global job runner instance
job_runner = JobRunner()
