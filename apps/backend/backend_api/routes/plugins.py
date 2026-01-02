from datetime import datetime
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import sys

from backend_db import get_session, PluginConfig

router = APIRouter(prefix="/plugins", tags=["Plugins"])


# --- Schemas ---

class PluginInfo(BaseModel):
    name: str
    description: str
    enabled: bool
    config: Optional[dict] = None
    last_run: Optional[datetime] = None
    run_count: int = 0


class PluginConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    config: Optional[dict] = None


# --- Helpers ---

def get_available_plugins() -> List[dict]:
    """Load available plugins from the plugins directory."""
    # Add parent paths for plugin imports
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
    
    plugins = []
    
    try:
        from plugins import load_plugins
        loaded = load_plugins()
        
        for plugin in loaded:
            plugins.append({
                "name": plugin.name,
                "description": plugin.description,
                "enabled": plugin.enabled,
            })
    except Exception as e:
        # Return built-in plugins if loading fails
        plugins = [
            {"name": "sentiment_tagger", "description": "Adds sentiment scores to posts", "enabled": True},
            {"name": "deduplicator", "description": "Removes duplicate posts", "enabled": True},
            {"name": "keyword_extractor", "description": "Extracts top keywords", "enabled": True},
        ]
    
    return plugins


# --- Routes ---

@router.get("", response_model=List[PluginInfo])
async def list_plugins(
    session: AsyncSession = Depends(get_session),
):
    """List all available plugins with their configuration."""
    available = get_available_plugins()
    
    # Get saved configurations
    result = await session.execute(select(PluginConfig))
    configs = {c.name: c for c in result.scalars().all()}
    
    plugins = []
    for plugin in available:
        config = configs.get(plugin["name"])
        
        plugins.append(PluginInfo(
            name=plugin["name"],
            description=plugin["description"],
            enabled=config.enabled if config else plugin["enabled"],
            config=config.config if config else None,
            last_run=config.last_run if config else None,
            run_count=config.run_count if config else 0,
        ))
    
    return plugins


@router.get("/{plugin_name}", response_model=PluginInfo)
async def get_plugin(
    plugin_name: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a single plugin by name."""
    available = get_available_plugins()
    plugin = next((p for p in available if p["name"] == plugin_name), None)
    
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    # Get saved configuration
    result = await session.execute(select(PluginConfig).where(PluginConfig.name == plugin_name))
    config = result.scalar_one_or_none()
    
    return PluginInfo(
        name=plugin["name"],
        description=plugin["description"],
        enabled=config.enabled if config else plugin["enabled"],
        config=config.config if config else None,
        last_run=config.last_run if config else None,
        run_count=config.run_count if config else 0,
    )


@router.post("/{plugin_name}/configure", response_model=PluginInfo)
async def configure_plugin(
    plugin_name: str,
    update: PluginConfigUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update plugin configuration."""
    available = get_available_plugins()
    plugin = next((p for p in available if p["name"] == plugin_name), None)
    
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    # Get or create configuration
    result = await session.execute(select(PluginConfig).where(PluginConfig.name == plugin_name))
    config = result.scalar_one_or_none()
    
    if not config:
        config = PluginConfig(name=plugin_name)
        session.add(config)
    
    # Update fields
    if update.enabled is not None:
        config.enabled = update.enabled
    if update.config is not None:
        config.config = update.config
    
    await session.commit()
    await session.refresh(config)
    
    return PluginInfo(
        name=plugin["name"],
        description=plugin["description"],
        enabled=config.enabled,
        config=config.config,
        last_run=config.last_run,
        run_count=config.run_count,
    )


@router.post("/{plugin_name}/run")
async def run_plugin(
    plugin_name: str,
    subreddit: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """
    Manually run a plugin on existing data.
    
    This runs the plugin on posts from the specified subreddit (or all posts).
    """
    from ..db import Post
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
    
    try:
        from plugins import load_plugins
        loaded = load_plugins()
        plugin = next((p for p in loaded if p.name == plugin_name), None)
        
        if not plugin:
            raise HTTPException(status_code=404, detail="Plugin not found")
        
        # Get posts to process
        query = select(Post)
        if subreddit:
            query = query.where(Post.subreddit.ilike(f"%{subreddit}%"))
        query = query.limit(1000)
        
        result = await session.execute(query)
        posts = result.scalars().all()
        
        # Convert to dicts for plugin processing
        post_dicts = [
            {
                "id": p.id,
                "title": p.title,
                "selftext": p.selftext,
                "author": p.author,
                "score": p.score,
            }
            for p in posts
        ]
        
        # Run plugin
        processed = plugin.process_posts(post_dicts)
        
        # Update posts with plugin results
        for p_dict in processed:
            post = next((p for p in posts if p.id == p_dict["id"]), None)
            if post:
                if "sentiment_score" in p_dict:
                    post.sentiment_score = p_dict["sentiment_score"]
                if "sentiment_label" in p_dict:
                    post.sentiment_label = p_dict["sentiment_label"]
                if "keywords" in p_dict:
                    post.keywords = p_dict["keywords"]
        
        await session.commit()
        
        # Update plugin run stats
        config_result = await session.execute(select(PluginConfig).where(PluginConfig.name == plugin_name))
        config = config_result.scalar_one_or_none()
        
        if not config:
            config = PluginConfig(name=plugin_name)
            session.add(config)
        
        config.last_run = datetime.now()
        config.run_count += 1
        await session.commit()
        
        return {
            "message": f"Plugin {plugin_name} executed",
            "posts_processed": len(processed),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plugin execution failed: {str(e)}")
