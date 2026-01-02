import asyncio
from sqlalchemy import select, func
from backend_db import init_db, get_session_context
from backend_db.models import Post, Comment
from backend_db.discovery_models import DiscoveredProblem

async def check():
    await init_db()
    async with get_session_context() as session:
        posts = await session.scalar(select(func.count(Post.id)))
        comments = await session.scalar(select(func.count(Comment.id)))
        problems = await session.scalar(select(func.count(DiscoveredProblem.id)))
        
        print(f"Posts: {posts}")
        print(f"Comments: {comments}")
        print(f"Problems: {problems}")

if __name__ == "__main__":
    asyncio.run(check())
