"""
News Data Providers

Integrates with news aggregation APIs to fetch trending topics and market coverage.
"""

from typing import Dict, List, Any, Optional
import logging

from .base import DataProvider, SignalType, MarketSignalData
from .apify_client import get_apify_client

logger = logging.getLogger(__name__)


class GoogleNewsProvider(DataProvider):
    """
    Google News Scraper integration.
    
    Tracks news mentions of topics for trend validation.
    High mention velocity = trending topic.
    """
    
    name = "google_news"
    signal_type = SignalType.NEWS
    description = "Google News - trend validation and coverage tracking"
    
    def get_actor_id(self) -> str:
        return "lhotanok/google-news-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "query": query,
            "maxItems": kwargs.get("limit", 30),
            "language": kwargs.get("language", "en"),
            "country": kwargs.get("country", "US"),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=3600,  # 1 hour cache for news (fresher data needed)
        )
        
        signals = []
        for article in results:
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=article.get("title", "Unknown"),
                description=article.get("description", "")[:500],
                url=article.get("link"),
                relevance_score=self.calculate_relevance(article, query),
                volume=1,
                raw_data={
                    "source": article.get("source"),
                    "published_at": article.get("publishedAt"),
                    "image": article.get("image"),
                },
            ))
        
        # Calculate velocity based on article count
        if signals:
            velocity = len(signals) / 7  # Weekly velocity
            for signal in signals:
                signal.velocity = velocity
        
        return signals


class RSSFeedProvider(DataProvider):
    """
    RSS Feed Scraper integration.
    
    Monitors industry RSS feeds for topic mentions.
    """
    
    name = "rss_feeds"
    signal_type = SignalType.NEWS
    description = "RSS Feed aggregation - industry news monitoring"
    
    def get_actor_id(self) -> str:
        return "apify/rss-feed-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        # Default tech/startup feeds
        feeds = kwargs.get("feed_urls", [
            "https://news.ycombinator.com/rss",
            "https://techcrunch.com/feed/",
            "https://feeds.feedburner.com/venturebeat/SZYF",
        ])
        
        run_input = {
            "urls": feeds,
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=1800,  # 30 min cache
        )
        
        # Filter results by query relevance
        signals = []
        query_lower = query.lower()
        
        for item in results:
            title = str(item.get("title", "")).lower()
            description = str(item.get("description", "")).lower()
            
            # Only include if query appears in content
            if query_lower in title or query_lower in description:
                signals.append(MarketSignalData(
                    source_type=self.signal_type,
                    source_name=self.name,
                    query_used=query,
                    title=item.get("title", "Unknown"),
                    description=item.get("description", "")[:500],
                    url=item.get("link"),
                    relevance_score=self.calculate_relevance(item, query),
                    volume=1,
                    raw_data={
                        "feed": item.get("feed"),
                        "published_at": item.get("pubDate"),
                    },
                ))
        
        return signals


class ProductHuntProvider(DataProvider):
    """
    Product Hunt Scraper integration.
    
    Tracks new product launches in relevant categories.
    Indicates competitive landscape and market validation.
    """
    
    name = "product_hunt"
    signal_type = SignalType.NEWS
    description = "Product Hunt - new product launches and competition"
    
    def get_actor_id(self) -> str:
        return "misceres/product-hunt-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "search": query,
            "maxItems": kwargs.get("limit", 20),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=43200,  # 12 hour cache
        )
        
        signals = []
        for product in results:
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=product.get("name", "Unknown"),
                description=product.get("tagline", "")[:500],
                url=product.get("url"),
                relevance_score=self.calculate_relevance(product, query),
                volume=product.get("votesCount", 0),  # Votes as volume proxy
                raw_data={
                    "votes": product.get("votesCount"),
                    "comments": product.get("commentsCount"),
                    "makers": product.get("makers"),
                    "launched_at": product.get("launchedAt"),
                    "topics": product.get("topics"),
                },
            ))
        
        return signals


def get_news_providers() -> List[DataProvider]:
    """Get all news/trend providers."""
    return [
        GoogleNewsProvider(),
        RSSFeedProvider(),
        ProductHuntProvider(),
    ]
