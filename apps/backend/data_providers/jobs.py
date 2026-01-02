"""
Jobs Data Providers

Integrates with job board APIs to fetch demand signals based on job postings.
"""

from typing import Dict, List, Any, Optional
import logging

from .base import DataProvider, SignalType, MarketSignalData
from .apify_client import get_apify_client

logger = logging.getLogger(__name__)


class LinkedInJobsProvider(DataProvider):
    """
    LinkedIn Jobs Scraper integration.
    
    Fetches job postings from LinkedIn to gauge market demand.
    High job volume = high demand signal.
    """
    
    name = "linkedin_jobs"
    signal_type = SignalType.JOBS
    description = "LinkedIn job postings - direct demand signal"
    
    def get_actor_id(self) -> str:
        return "bebity/linkedin-jobs-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        location = kwargs.get("location", "United States")
        limit = kwargs.get("limit", 50)
        
        run_input = {
            "searchQueries": [query],
            "location": location,
            "maxResults": limit,
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache for job postings
        )
        
        signals = []
        for job in results:
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=job.get("title", "Unknown"),
                description=job.get("description", "")[:500],
                url=job.get("url"),
                relevance_score=self.calculate_relevance(job, query),
                volume=1,  # Each job = 1 unit of demand
                raw_data={
                    "company": job.get("company"),
                    "location": job.get("location"),
                    "salary": job.get("salary"),
                    "posted_at": job.get("postedAt"),
                    "applicants": job.get("applicantCount"),
                },
            ))
        
        return signals


class IndeedJobsProvider(DataProvider):
    """
    Indeed Job Scraper integration.
    
    Broader market coverage than LinkedIn.
    """
    
    name = "indeed_jobs"
    signal_type = SignalType.JOBS
    description = "Indeed job postings - broad market demand"
    
    def get_actor_id(self) -> str:
        return "misceres/indeed-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        country = kwargs.get("country", "US")
        limit = kwargs.get("limit", 50)
        
        run_input = {
            "queries": [query],
            "country": country,
            "maxItems": limit,
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,
        )
        
        signals = []
        for job in results:
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=job.get("title", "Unknown"),
                description=job.get("description", "")[:500],
                url=job.get("url"),
                relevance_score=self.calculate_relevance(job, query),
                volume=1,
                raw_data={
                    "company": job.get("company"),
                    "location": job.get("location"),
                    "salary": job.get("salary"),
                    "job_type": job.get("jobType"),
                },
            ))
        
        return signals


class AdzunaJobsProvider(DataProvider):
    """
    Adzuna Job Scraper integration.
    
    European and international job market coverage.
    """
    
    name = "adzuna_jobs"
    signal_type = SignalType.JOBS
    description = "Adzuna job postings - international coverage"
    
    def get_actor_id(self) -> str:
        return "scrapestorm/adzuna-job-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        search_url = kwargs.get("search_url")
        if not search_url:
            # Construct a basic search URL
            search_url = f"https://www.adzuna.com/search?q={query.replace(' ', '+')}"
        
        run_input = {
            "startUrls": [{"url": search_url}],
            "maxItems": kwargs.get("limit", 50),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,
        )
        
        signals = []
        for job in results:
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=job.get("title", "Unknown"),
                description=job.get("description", "")[:500],
                url=job.get("url"),
                relevance_score=self.calculate_relevance(job, query),
                volume=1,
                raw_data={
                    "company": job.get("company"),
                    "location": job.get("location"),
                    "salary": job.get("salary"),
                },
            ))
        
        return signals


class GlassdoorProvider(DataProvider):
    """
    Glassdoor Scraper integration.
    
    Fetches job listings AND company reviews/ratings.
    High-value signal for validated market demand + company sentiment.
    """
    
    name = "glassdoor"
    signal_type = SignalType.JOBS
    description = "Glassdoor - jobs, company reviews, salary data"
    
    def get_actor_id(self) -> str:
        return "agentx/glassdoor-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        limit = kwargs.get("limit", 30)
        
        run_input = {
            "searchQuery": query,
            "maxResults": limit,
            "includeReviews": True,
            "includeSalaries": True,
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache
        )
        
        signals = []
        for item in results:
            # Handle both job listings and company reviews
            title = item.get("jobTitle") or item.get("companyName", "Unknown")
            description = item.get("jobDescription") or item.get("review", "")
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=title,
                description=description[:500] if description else "",
                url=item.get("url"),
                relevance_score=self.calculate_relevance(item, query),
                volume=1,
                raw_data={
                    "company": item.get("companyName"),
                    "rating": item.get("overallRating"),
                    "salary": item.get("salary"),
                    "location": item.get("location"),
                    "pros": item.get("pros"),
                    "cons": item.get("cons"),
                },
            ))
        
        return signals


class UpworkProvider(DataProvider):
    """
    Upwork Feed Scraper integration.
    
    Fetches freelance job postings to gauge market demand.
    High freelance activity = emerging market need.
    """
    
    name = "upwork_feed"
    signal_type = SignalType.JOBS
    description = "Upwork - freelance demand signals"
    
    def get_actor_id(self) -> str:
        return "hyperbach/upwork-feed"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        limit = kwargs.get("limit", 30)
        
        run_input = {
            "searchQuery": query,
            "maxItems": limit,
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=43200,  # 12 hour cache for faster-moving freelance market
        )
        
        signals = []
        for job in results:
            budget = job.get("budget") or job.get("hourlyRange", "")
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=job.get("title", "Unknown"),
                description=job.get("description", "")[:500],
                url=job.get("url"),
                relevance_score=self.calculate_relevance(job, query),
                volume=1,
                velocity=job.get("proposals", 0),  # More proposals = trending
                raw_data={
                    "budget": budget,
                    "proposals": job.get("proposals"),
                    "client_rating": job.get("clientRating"),
                    "skills": job.get("skills"),
                    "job_type": job.get("jobType"),
                    "experience_level": job.get("experienceLevel"),
                },
            ))
        
        return signals


def get_jobs_providers() -> List[DataProvider]:
    """Get all job market providers."""
    return [
        LinkedInJobsProvider(),
        IndeedJobsProvider(),
        AdzunaJobsProvider(),
        GlassdoorProvider(),
        UpworkProvider(),
    ]

