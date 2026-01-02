"""
Apify Service - Google Search Scraping Integration

Uses Apify's Google Search Scraper to find problems across:
- Reddit, Hacker News, Twitter, Quora, Indie Hackers, Product Hunt
"""
import os
import asyncio
import aiohttp
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Platform(str, Enum):
    """Supported platforms for problem discovery."""
    REDDIT = "reddit"
    HACKERNEWS = "hackernews"
    TWITTER = "twitter"
    INDIEHACKERS = "indiehackers"
    QUORA = "quora"
    PRODUCTHUNT = "producthunt"
    G2 = "g2"
    CAPTERRA = "capterra"


# Platform to site: prefix mapping
PLATFORM_SITES = {
    Platform.REDDIT: "site:reddit.com",
    Platform.HACKERNEWS: "site:news.ycombinator.com",
    Platform.TWITTER: "site:twitter.com OR site:x.com",
    Platform.INDIEHACKERS: "site:indiehackers.com",
    Platform.QUORA: "site:quora.com",
    Platform.PRODUCTHUNT: "site:producthunt.com",
    Platform.G2: "site:g2.com/products",
    Platform.CAPTERRA: "site:capterra.com",
}


# Default keywords to search for (problem signals)
DEFAULT_KEYWORDS = [
    "is there a tool for",
    "is there an app for",
    "is there a way to",
    "looking for a tool",
    "looking for an app",
    "any recommendations for",
    "does anyone know of",
    "what do you use for",
    "I wish there was",
    "why isn't there",
    "I need a tool that",
    "is there software for",
    "how do you guys handle",
    "struggling to find",
    "can't find a good",
]


@dataclass
class SearchResult:
    """A single search result (potential problem)."""
    title: str
    url: str
    snippet: str
    platform: Platform
    keyword_matched: str
    discovered_at: datetime = field(default_factory=datetime.now)
    
    # Extracted metadata
    domain: str = ""
    
    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet,
            "platform": self.platform.value,
            "keyword_matched": self.keyword_matched,
            "discovered_at": self.discovered_at.isoformat(),
            "domain": self.domain,
        }


class ApifyService:
    """
    Apify integration for Google Search scraping.
    
    Supports multiple actors:
    - tuningsearch/cheap-google-search-scraper (default - fast & cheap)
    - apify/google-search-scraper (official - more features)
    """
    
    # Apify API endpoints
    API_BASE = "https://api.apify.com/v2"
    
    # Default to TuningSearch (cheap & fast)
    # Change to "apify/google-search-scraper" for official scraper
    DEFAULT_ACTOR_ID = "tuningsearch/cheap-google-search-results-scraper"
    
    def __init__(self, api_token: Optional[str] = None, actor_id: Optional[str] = None):
        self.api_token = api_token or os.getenv("APIFY_API_TOKEN", "")
        self.actor_id = actor_id or os.getenv("APIFY_ACTOR_ID", self.DEFAULT_ACTOR_ID)
    
    @property
    def is_configured(self) -> bool:
        """Check if Apify token is configured."""
        return bool(self.api_token)
    
    def build_search_query(
        self,
        keyword: str,
        platforms: List[Platform],
        time_filter: str = "y"  # y=year, m=month, w=week, d=day
    ) -> str:
        """
        Build a Google search query for the keyword across platforms.
        
        Example: site:reddit.com OR site:news.ycombinator.com "is there a tool for"
        """
        # Combine site: prefixes
        site_filters = " OR ".join(PLATFORM_SITES[p] for p in platforms)
        
        # Wrap keyword in quotes for exact match
        query = f'({site_filters}) "{keyword}"'
        
        return query
    
    async def search(
        self,
        keywords: List[str],
        platforms: List[Platform],
        max_results_per_keyword: int = 20,
        time_filter: str = "y",
    ) -> List[SearchResult]:
        """
        Search for problems using Google Search via Apify.
        
        Args:
            keywords: List of problem-signal keywords
            platforms: List of platforms to search
            max_results_per_keyword: Max results per keyword search
            time_filter: Time filter (y=year, m=month, w=week, d=day)
        
        Returns:
            List of SearchResult objects
        """
        if not self.is_configured:
            raise ValueError("Apify API token not configured. Set APIFY_API_TOKEN in .env")
        
        all_results: List[SearchResult] = []
        
        # Build queries for each keyword
        queries = []
        for keyword in keywords:
            query = self.build_search_query(keyword, platforms, time_filter)
            queries.append({
                "query": query,
                "keyword": keyword,
            })
        
        # Run Apify actor
        for q in queries:
            try:
                results = await self._run_search(
                    query=q["query"],
                    max_results=max_results_per_keyword,
                )
                
                # Parse results
                for r in results:
                    platform = self._detect_platform(r.get("url", ""))
                    if platform:
                        all_results.append(SearchResult(
                            title=r.get("title", ""),
                            url=r.get("url", ""),
                            snippet=r.get("description", ""),
                            platform=platform,
                            keyword_matched=q["keyword"],
                            domain=r.get("domain", ""),
                        ))
                
                # Small delay between queries to be nice
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"[Apify] Search failed for keyword '{q['keyword']}': {e}")
                continue
        
        return all_results
    
    async def _run_search(self, query: str, max_results: int = 20) -> List[Dict]:
        """Run the Google Search actor and return results."""
        
        # TuningSearch actor input format
        # See: https://apify.com/tuningsearch/cheap-google-search-results-scraper
        actor_input = {
            "query": query,        # Required: search query
            "language": "en",      # Optional: default en
            "page": 1,             # Optional: page number (1-indexed)
        }
        
        headers = {
            "Content-Type": "application/json",
        }
        
        # Start actor run (using configured actor)
        # Note: Apify API uses ~ instead of / for actor IDs
        actor_path = self.actor_id.replace("/", "~")
        run_url = f"{self.API_BASE}/acts/{actor_path}/run-sync-get-dataset-items"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                run_url,
                json=actor_input,
                headers=headers,
                params={"token": self.api_token},
                timeout=aiohttp.ClientTimeout(total=120),
            ) as response:
                if response.status != 201 and response.status != 200:
                    text = await response.text()
                    raise Exception(f"Apify API error: {response.status} - {text[:200]}")
                
                data = await response.json()
                
                # Parse results based on actor output format
                # TuningSearch returns a flat list of results or nested structure
                results = []
                if isinstance(data, list):
                    for item in data:
                        # Check for organic results (official format)
                        if "organicResults" in item:
                            results.extend(item.get("organicResults", []))
                        # Check for direct results (TuningSearch may use this)
                        elif "title" in item and "url" in item:
                            results.append(item)
                        elif "link" in item:
                            # Map 'link' to 'url' for consistency
                            results.append({
                                "title": item.get("title", ""),
                                "url": item.get("link", ""),
                                "description": item.get("snippet", item.get("description", "")),
                            })
                
                return results[:max_results]
    
    def _detect_platform(self, url: str) -> Optional[Platform]:
        """Detect which platform a URL belongs to."""
        url_lower = url.lower()
        
        if "reddit.com" in url_lower:
            return Platform.REDDIT
        elif "news.ycombinator.com" in url_lower:
            return Platform.HACKERNEWS
        elif "twitter.com" in url_lower or "x.com" in url_lower:
            return Platform.TWITTER
        elif "indiehackers.com" in url_lower:
            return Platform.INDIEHACKERS
        elif "quora.com" in url_lower:
            return Platform.QUORA
        elif "producthunt.com" in url_lower:
            return Platform.PRODUCTHUNT
        
        return None


# Global service instance
apify_service = ApifyService()
