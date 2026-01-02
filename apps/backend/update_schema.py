import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://neoadmin:password@localhost/reddit_scraper_v2")

async def update_schema():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_async_engine(DATABASE_URL)
    
    commands = [
        "ALTER TABLE multi_source_validations ADD COLUMN IF NOT EXISTS search_score FLOAT DEFAULT 0.0;",
        "ALTER TABLE multi_source_validations ADD COLUMN IF NOT EXISTS reviews_score FLOAT DEFAULT 0.0;",
        "ALTER TABLE multi_source_validations ADD COLUMN IF NOT EXISTS startups_score FLOAT DEFAULT 0.0;",
        "ALTER TABLE multi_source_validations ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;",
        "ALTER TABLE multi_source_validations ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;",
        "ALTER TABLE multi_source_validations ADD COLUMN IF NOT EXISTS startups_count INTEGER DEFAULT 0;",
    ]
    
    async with engine.begin() as conn:
        for cmd in commands:
            print(f"Executing: {cmd}")
            await conn.execute(text(cmd))
            
    print("Schema update complete!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_schema())
