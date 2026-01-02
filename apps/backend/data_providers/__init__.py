"""
Data Providers Package

Multi-source data provider system for the Market Validation Toolkit.
Integrates with Apify APIs for Jobs, News, Social Media, Search, Reviews, and Startups.
"""

from .base import DataProvider, DataProviderManager, SignalType, MarketSignalData
from .apify_client import ApifyClientWrapper
from .jobs import get_jobs_providers
from .news import get_news_providers
from .social import get_social_providers
from .search import get_search_providers
from .reviews import get_reviews_providers
from .startups import get_startup_providers

__all__ = [
    "DataProvider",
    "DataProviderManager",
    "SignalType",
    "MarketSignalData",
    "ApifyClientWrapper",
    "get_jobs_providers",
    "get_news_providers",
    "get_social_providers",
    "get_search_providers",
    "get_reviews_providers",
    "get_startup_providers",
]

