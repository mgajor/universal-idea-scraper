"""
Apify Client Wrapper

Unified client for interacting with Apify APIs.
Includes rate limiting, caching, and error handling.
"""

import os
import asyncio
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Cache entry for API responses."""
    data: Any
    fetched_at: datetime
    expires_at: datetime


class ApifyClientWrapper:
    """
    Wrapper around the Apify API client.
    
    Features:
    - Rate limiting to avoid quota exhaustion
    - Response caching with configurable TTL
    - Automatic retries with exponential backoff
    - Cost tracking
    """
    
    def __init__(
        self,
        api_token: Optional[str] = None,
        rate_limit: int = 10,  # requests per minute
        cache_ttl: int = 86400,  # 24 hours default
    ):
        self.api_token = api_token or os.getenv("APIFY_API_TOKEN")
        self.rate_limit = rate_limit
        self.cache_ttl = cache_ttl
        
        self._cache: Dict[str, CacheEntry] = {}
        self._request_times: List[datetime] = []
        self._total_cost: float = 0.0
        
        # Try to import apify-client
        self._client = None
        if self.api_token:
            try:
                from apify_client import ApifyClient
                self._client = ApifyClient(self.api_token)
                logger.info("Apify client initialized successfully")
            except ImportError:
                logger.warning("apify-client not installed. Run: pip install apify-client")
    
    @property
    def is_configured(self) -> bool:
        """Check if the client is properly configured."""
        return self._client is not None
    
    def _get_cache_key(self, actor_id: str, run_input: Dict) -> str:
        """Generate a unique cache key for a request."""
        input_str = json.dumps(run_input, sort_keys=True)
        hash_input = f"{actor_id}:{input_str}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    def _check_cache(self, cache_key: str) -> Optional[Any]:
        """Check if we have a valid cached response."""
        entry = self._cache.get(cache_key)
        if entry and datetime.utcnow() < entry.expires_at:
            logger.debug(f"Cache hit for {cache_key[:8]}...")
            return entry.data
        return None
    
    def _store_cache(self, cache_key: str, data: Any, ttl: Optional[int] = None):
        """Store a response in cache."""
        expires_at = datetime.utcnow() + timedelta(seconds=ttl or self.cache_ttl)
        self._cache[cache_key] = CacheEntry(
            data=data,
            fetched_at=datetime.utcnow(),
            expires_at=expires_at,
        )
    
    async def _wait_for_rate_limit(self):
        """Wait if we've exceeded the rate limit."""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        # Remove old request times
        self._request_times = [t for t in self._request_times if t > minute_ago]
        
        # Wait if at limit
        if len(self._request_times) >= self.rate_limit:
            oldest = min(self._request_times)
            wait_time = (oldest + timedelta(minutes=1) - now).total_seconds()
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
        
        self._request_times.append(now)
    
    async def run_actor(
        self,
        actor_id: str,
        run_input: Dict[str, Any],
        timeout_secs: int = 120,
        memory_mbytes: int = 256,
        use_cache: bool = True,
        cache_ttl: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Run an Apify actor and return the results.
        
        Args:
            actor_id: The Apify actor ID (e.g., "apify/google-search-scraper")
            run_input: Input parameters for the actor
            timeout_secs: Maximum run time
            memory_mbytes: Memory allocation
            use_cache: Whether to use cached results
            cache_ttl: Custom cache TTL in seconds
            
        Returns:
            List of result items from the actor
        """
        if not self._client:
            logger.error("Apify client not configured. Set APIFY_API_TOKEN.")
            return []
        
        # Check cache first
        cache_key = self._get_cache_key(actor_id, run_input)
        if use_cache:
            cached = self._check_cache(cache_key)
            if cached is not None:
                return cached
        
        # Rate limit
        await self._wait_for_rate_limit()
        
        try:
            logger.info(f"Running actor: {actor_id}")
            
            # Run the actor synchronously (Apify client is sync)
            run = await asyncio.to_thread(
                lambda: self._client.actor(actor_id).call(
                    run_input=run_input,
                    timeout_secs=timeout_secs,
                    memory_mbytes=memory_mbytes,
                )
            )
            
            # Get results from the dataset
            dataset_items = await asyncio.to_thread(
                lambda: self._client.dataset(run["defaultDatasetId"]).list_items().items
            )
            
            # Track cost (approximation)
            run_cost = run.get("stats", {}).get("computeUnits", 0) * 0.25
            self._total_cost += run_cost
            logger.info(f"Actor completed. Items: {len(dataset_items)}, Cost: ${run_cost:.4f}")
            
            # Cache results
            if use_cache:
                self._store_cache(cache_key, dataset_items, cache_ttl)
            
            return dataset_items
            
        except Exception as e:
            logger.error(f"Apify actor {actor_id} failed: {e}")
            return []
    
    async def run_actor_with_retry(
        self,
        actor_id: str,
        run_input: Dict[str, Any],
        max_retries: int = 3,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Run actor with automatic retries on failure."""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return await self.run_actor(actor_id, run_input, **kwargs)
            except Exception as e:
                last_error = e
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                await asyncio.sleep(wait_time)
        
        logger.error(f"All {max_retries} attempts failed for {actor_id}: {last_error}")
        return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            "total_cost": self._total_cost,
            "cached_entries": len(self._cache),
            "requests_this_minute": len(self._request_times),
            "rate_limit": self.rate_limit,
            "is_configured": self.is_configured,
        }
    
    def clear_cache(self, older_than_hours: Optional[int] = None):
        """Clear cache, optionally only old entries."""
        if older_than_hours is None:
            self._cache.clear()
            logger.info("Cache cleared")
        else:
            cutoff = datetime.utcnow() - timedelta(hours=older_than_hours)
            old_keys = [k for k, v in self._cache.items() if v.fetched_at < cutoff]
            for key in old_keys:
                del self._cache[key]
            logger.info(f"Cleared {len(old_keys)} old cache entries")


# Global instance for easy access
_default_client: Optional[ApifyClientWrapper] = None


def get_apify_client() -> ApifyClientWrapper:
    """Get the default Apify client instance."""
    global _default_client
    if _default_client is None:
        _default_client = ApifyClientWrapper()
    return _default_client
