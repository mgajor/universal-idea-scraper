#!/usr/bin/env python3
"""
Import posts from CSV files into PostgreSQL database.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
from backend_db import init_db, get_session_context, Post
from dateutil import parser as date_parser


async def import_csv_to_db(csv_path: Path, subreddit: str) -> int:
    """Import posts from a CSV file to the database."""
    if not csv_path.exists():
        print(f"  [SKIP] {csv_path} not found")
        return 0
    
    df = pd.read_csv(csv_path)
    print(f"  [INFO] Found {len(df)} rows in {csv_path.name}")
    
    count = 0
    async with get_session_context() as session:
        for _, row in df.iterrows():
            try:
                # Parse created_utc
                created_utc = None
                if pd.notna(row.get("created_utc")):
                    try:
                        val = row["created_utc"]
                        if isinstance(val, (int, float)):
                            created_utc = datetime.fromtimestamp(val)
                        else:
                            created_utc = date_parser.parse(str(val))
                    except:
                        pass
                
                # Create Post object
                post = Post(
                    id=str(row.get("id", ""))[:20],
                    subreddit=subreddit[:100],
                    title=str(row.get("title", ""))[:500] if pd.notna(row.get("title")) else "Untitled",
                    author=str(row.get("author", ""))[:100] if pd.notna(row.get("author")) else None,
                    created_utc=created_utc,
                    permalink=str(row.get("permalink", ""))[:500],
                    url=str(row.get("url")) if pd.notna(row.get("url")) else None,
                    score=int(row.get("score", 0)) if pd.notna(row.get("score")) else 0,
                    upvote_ratio=float(row.get("upvote_ratio", 0)) if pd.notna(row.get("upvote_ratio")) else 0,
                    num_comments=int(row.get("num_comments", 0)) if pd.notna(row.get("num_comments")) else 0,
                    num_crossposts=int(row.get("num_crossposts", 0)) if pd.notna(row.get("num_crossposts")) else 0,
                    selftext=str(row.get("selftext")) if pd.notna(row.get("selftext")) else None,
                    post_type=str(row.get("post_type", "text"))[:20] if pd.notna(row.get("post_type")) else "text",
                    is_nsfw=bool(row.get("is_nsfw", False)) if pd.notna(row.get("is_nsfw")) else False,
                    is_spoiler=bool(row.get("is_spoiler", False)) if pd.notna(row.get("is_spoiler")) else False,
                    flair=str(row.get("flair", ""))[:100] if pd.notna(row.get("flair")) else None,
                    total_awards=int(row.get("total_awards", 0)) if pd.notna(row.get("total_awards")) else 0,
                    has_media=bool(row.get("has_media", False)) if pd.notna(row.get("has_media")) else False,
                    media_downloaded=bool(row.get("media_downloaded", False)) if pd.notna(row.get("media_downloaded")) else False,
                    source=str(row.get("source", "csv-import"))[:50],
                    run_id=None,  # No run_id for imported posts
                )
                
                # Use merge to handle duplicates
                await session.merge(post)
                count += 1
                
            except Exception as e:
                print(f"  [WARN] Error importing row: {e}")
                continue
        
        await session.commit()
    
    return count


async def main():
    print("=" * 50)
    print("CSV to PostgreSQL Import Script")
    print("=" * 50)
    
    # Initialize database
    await init_db()
    print("[OK] Database initialized")
    
    # Find all CSV files
    data_dir = Path(__file__).parent / "data"
    if not data_dir.exists():
        print(f"[ERROR] Data directory not found: {data_dir}")
        return
    
    total_imported = 0
    
    # Import each subreddit's posts
    for subdir in sorted(data_dir.iterdir()):
        if subdir.is_dir() and subdir.name.startswith("r_"):
            subreddit = subdir.name[2:]  # Remove "r_" prefix
            csv_path = subdir / "posts.csv"
            
            print(f"\n[IMPORT] r/{subreddit}")
            count = await import_csv_to_db(csv_path, subreddit)
            print(f"  [OK] Imported {count} posts")
            total_imported += count
    
    print(f"\n{'=' * 50}")
    print(f"[DONE] Total imported: {total_imported} posts")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
