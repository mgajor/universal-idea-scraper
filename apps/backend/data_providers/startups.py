"""
Startup Intelligence Data Providers

Integrates with startup databases and tech analysis tools.
"""

from typing import Dict, List, Any, Optional
import logging

from .base import DataProvider, SignalType, MarketSignalData
from .apify_client import get_apify_client

logger = logging.getLogger(__name__)


class YCombinatorProvider(DataProvider):
    """
    Y Combinator Scraper integration.
    
    Fetches YC company data to gauge startup activity in a space.
    High YC company density = validated market opportunity.
    """
    
    name = "y_combinator"
    signal_type = SignalType.STARTUPS
    description = "Y Combinator - startup activity and competition"
    
    def get_actor_id(self) -> str:
        return "damilo/y-combinator-scraper-apify"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchQuery": query,
            "maxResults": kwargs.get("limit", 20),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=604800,  # 1 week cache - YC data is stable
        )
        
        signals = []
        for company in results:
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=company.get("name", "Unknown"),
                description=company.get("description", company.get("tagline", ""))[:500],
                url=company.get("url") or company.get("website"),
                relevance_score=self.calculate_relevance(company, query),
                volume=1,  # Each YC company = significant signal
                raw_data={
                    "batch": company.get("batch"),
                    "status": company.get("status"),  # Active, Acquired, etc.
                    "industry": company.get("industry"),
                    "team_size": company.get("teamSize"),
                    "funding": company.get("fundingAmount"),
                    "founders": company.get("founders"),
                    "yc_url": company.get("ycombinatorUrl"),
                },
            ))
        
        return signals


class BuiltWithProvider(DataProvider):
    """
    BuiltWith Bulk Technology Scraper integration.
    
    Fetches technology usage data to gauge market adoption.
    """
    
    name = "builtwith_tech"
    signal_type = SignalType.STARTUPS
    description = "BuiltWith - technology adoption trends"
    
    def get_actor_id(self) -> str:
        return "scrapegoats/builtwith-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchQuery": query,
            "maxResults": kwargs.get("limit", 15),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=604800,  # 1 week cache
        )
        
        signals = []
        for tech in results:
            usage_count = tech.get("websitesUsing", 0) or tech.get("usage", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=tech.get("name", tech.get("technology", "Unknown")),
                description=tech.get("description", "")[:500],
                url=tech.get("url"),
                relevance_score=self.calculate_relevance(tech, query),
                volume=usage_count,  # Websites using = market size
                raw_data={
                    "category": tech.get("category"),
                    "websites_using": usage_count,
                    "market_share": tech.get("marketShare"),
                    "trend": tech.get("trend"),  # Growing, Declining, etc.
                },
            ))
        
        return signals


class CompanyResearchProvider(DataProvider):
    """
    Company Research Intelligence Tool integration.
    
    Deep company insights for competitive analysis.
    """
    
    name = "company_research"
    signal_type = SignalType.STARTUPS
    description = "Company research - deep competitive intelligence"
    
    def get_actor_id(self) -> str:
        return "easyapi/company-research-intelligence-tool"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "companyName": query,
            "includeNews": True,
            "includeFunding": True,
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache
        )
        
        signals = []
        for company in results:
            # Funding amount as volume indicator
            funding = company.get("totalFunding", 0)
            if isinstance(funding, str):
                # Try to parse funding strings like "$10M"
                funding = 1
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=company.get("name", query),
                description=company.get("description", "")[:500],
                url=company.get("website"),
                relevance_score=self.calculate_relevance(company, query),
                volume=funding if isinstance(funding, (int, float)) else 1,
                raw_data={
                    "industry": company.get("industry"),
                    "employees": company.get("employeeCount"),
                    "funding": company.get("totalFunding"),
                    "founded": company.get("foundedYear"),
                    "headquarters": company.get("headquarters"),
                    "recent_news": company.get("recentNews", [])[:3],
                    "competitors": company.get("competitors"),
                },
            ))
        
        return signals


class YCFoundersProvider(DataProvider):
    """
    Y Combinator Founders Scraper integration.
    
    Fetches founder profiles for networking and trend analysis.
    """
    
    name = "yc_founders"
    signal_type = SignalType.STARTUPS
    description = "YC Founders - active founders in space"
    
    def get_actor_id(self) -> str:
        return "prog-party/y-combinator-founders"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchQuery": query,
            "maxResults": kwargs.get("limit", 15),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=604800,  # 1 week cache
        )
        
        signals = []
        for founder in results:
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=founder.get("name", "Unknown"),
                description=founder.get("bio", "")[:500],
                url=founder.get("linkedinUrl") or founder.get("twitterUrl"),
                relevance_score=self.calculate_relevance(founder, query),
                volume=1,
                raw_data={
                    "company": founder.get("company"),
                    "role": founder.get("role"),
                    "batch": founder.get("batch"),
                    "linkedin": founder.get("linkedinUrl"),
                    "twitter": founder.get("twitterUrl"),
                },
            ))
        
        return signals


def get_startup_providers() -> List[DataProvider]:
    """Get all startup intelligence providers."""
    return [
        YCombinatorProvider(),
        BuiltWithProvider(),
        CompanyResearchProvider(),
        YCFoundersProvider(),
    ]
