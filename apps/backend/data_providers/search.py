"""
Search Data Providers

Integrates with search engines to fetch demand signals based on search volume.
"""

from typing import Dict, List, Any, Optional
import logging

from .base import DataProvider, SignalType, MarketSignalData
from .apify_client import get_apify_client

logger = logging.getLogger(__name__)


class GoogleSearchProvider(DataProvider):
    """
    Google Search Results Scraper integration.
    
    Fetches search results to gauge market demand.
    High search volume = high problem awareness.
    """
    
    name = "google_search"
    signal_type = SignalType.SEARCH
    description = "Google search results - demand and competition signals"
    
    def get_actor_id(self) -> str:
        return "damilo/google-search-apify"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        limit = kwargs.get("limit", 20)
        
        run_input = {
            "query": query,
            "maxResults": limit,
            "countryCode": kwargs.get("country", "us"),
            "languageCode": kwargs.get("language", "en"),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache
        )
        
        signals = []
        for idx, result in enumerate(results):
            # Position in search indicates relevance
            position_score = max(100 - (idx * 5), 10)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=result.get("title", "Unknown"),
                description=result.get("description", result.get("snippet", ""))[:500],
                url=result.get("url") or result.get("link"),
                relevance_score=position_score,
                volume=1,  # Each result = 1 signal
                raw_data={
                    "position": idx + 1,
                    "domain": result.get("domain"),
                    "displayed_url": result.get("displayedUrl"),
                    "is_ad": result.get("isAd", False),
                },
            ))
        
        return signals


class GoogleImagesProvider(DataProvider):
    """
    Google Images Scraper integration.
    
    Fetches image search results to gauge visual content presence.
    """
    
    name = "google_images"
    signal_type = SignalType.SEARCH
    description = "Google images - visual content presence"
    
    def get_actor_id(self) -> str:
        return "damilo/google-images-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "query": query,
            "maxResults": kwargs.get("limit", 15),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache
        )
        
        signals = []
        for idx, image in enumerate(results):
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=image.get("title", "Image"),
                description=image.get("description", "")[:200],
                url=image.get("sourceUrl") or image.get("url"),
                relevance_score=max(100 - (idx * 5), 10),
                volume=1,
                raw_data={
                    "position": idx + 1,
                    "image_url": image.get("imageUrl"),
                    "source_domain": image.get("sourceDomain"),
                    "dimensions": image.get("dimensions"),
                },
            ))
        
        return signals


def get_search_providers() -> List[DataProvider]:
    """Get all search engine providers."""
    return [
        GoogleSearchProvider(),
        GoogleImagesProvider(),
    ]
