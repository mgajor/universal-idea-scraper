import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, func
from backend_db import init_db, get_session_context
from backend_db.models import Post, Comment
from backend_db.discovery_models import DiscoveredProblem

async def test_overview():
    print("Connecting...")
    await init_db()
    async with get_session_context() as session:
        # Replicates the logic in analytics.py
        total_posts = await session.scalar(select(func.count(Post.id)))
        total_comments = await session.scalar(select(func.count(Comment.id)))
        total_problems = await session.scalar(select(func.count(DiscoveredProblem.id)))

        merged_total = (total_posts or 0) + (total_problems or 0)
        
        print(f"Total Posts (DB): {total_posts}")
        print(f"Total Problems (DB): {total_problems}")
        print(f"Merged Total: {merged_total}")
        
        if merged_total > 0:
            print("SUCCESS: Merged total is positive.")
        else:
            print("FAILURE: Merged total is still 0.")

if __name__ == "__main__":
    asyncio.run(test_overview())
