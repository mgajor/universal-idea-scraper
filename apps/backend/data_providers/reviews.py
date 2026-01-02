"""
Reviews Data Providers

Integrates with review platforms to fetch sentiment signals.
"""

from typing import Dict, List, Any, Optional
import logging

from .base import DataProvider, SignalType, MarketSignalData
from .apify_client import get_apify_client

logger = logging.getLogger(__name__)


class TrustpilotProvider(DataProvider):
    """
    Trustpilot Extractor integration.
    
    Fetches company reviews to gauge competitor sentiment.
    High negative reviews = opportunity for better solution.
    """
    
    name = "trustpilot_reviews"
    signal_type = SignalType.REVIEWS
    description = "Trustpilot - competitor review sentiment"
    
    def get_actor_id(self) -> str:
        return "jupri/trustpilot"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchQuery": query,
            "maxReviews": kwargs.get("limit", 30),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache - reviews don't change fast
        )
        
        signals = []
        for review in results:
            rating = review.get("rating", 3)
            # Lower ratings are MORE interesting for problem validation
            # (shows pain points)
            opportunity_score = max(100 - (rating * 20), 20)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=review.get("title", "Review"),
                description=review.get("text", review.get("content", ""))[:500],
                url=review.get("url"),
                relevance_score=self.calculate_relevance(review, query),
                volume=1,
                sentiment=rating,  # 1-5 star rating
                raw_data={
                    "company": review.get("companyName"),
                    "rating": rating,
                    "author": review.get("author"),
                    "date": review.get("date"),
                    "verified": review.get("isVerified"),
                    "reply": review.get("companyReply"),
                },
            ))
        
        return signals


class GumroadReviewsProvider(DataProvider):
    """
    Gumroad Reviews Scraper integration.
    
    Fetches product reviews to gauge digital product market.
    """
    
    name = "gumroad_reviews"
    signal_type = SignalType.REVIEWS
    description = "Gumroad - digital product market validation"
    
    def get_actor_id(self) -> str:
        return "easyapi/gumroad-reviews-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchQuery": query,
            "maxReviews": kwargs.get("limit", 20),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,
        )
        
        signals = []
        for item in results:
            rating = item.get("rating", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=item.get("productName", "Product"),
                description=item.get("reviewText", "")[:500],
                url=item.get("productUrl"),
                relevance_score=self.calculate_relevance(item, query),
                volume=item.get("salesCount", 1),  # Sales = demand
                sentiment=rating,
                raw_data={
                    "product": item.get("productName"),
                    "price": item.get("price"),
                    "rating": rating,
                    "sales": item.get("salesCount"),
                    "creator": item.get("creatorName"),
                },
            ))
        
        return signals


def get_reviews_providers() -> List[DataProvider]:
    """Get all review platform providers."""
    return [
        TrustpilotProvider(),
        GumroadReviewsProvider(),
    ]
