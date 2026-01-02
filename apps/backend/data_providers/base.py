"""
Base classes for data providers.

Defines the abstract interface for all data source integrations.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional, List, Dict
import logging

logger = logging.getLogger(__name__)


class SignalType(str, Enum):
    """Types of market signals from different sources."""
    JOBS = "jobs"
    NEWS = "news"
    SOCIAL = "social"
    DEVELOPER = "developer"
    ECOMMERCE = "ecommerce"
    SEARCH = "search"        # Google search, image search
    REVIEWS = "reviews"      # Trustpilot, Gumroad reviews
    STARTUPS = "startups"    # YC, BuiltWith, Company research


@dataclass
class MarketSignalData:
    """Normalized market signal from any data source."""
    source_type: SignalType
    source_name: str  # e.g., "linkedin_jobs", "google_news"
    query_used: str   # The search query that found this
    
    # Core data
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    
    # Signal metrics
    relevance_score: float = 0.0  # 0-1 score from provider
    volume: int = 0               # Count (job postings, mentions, etc.)
    velocity: float = 0.0         # Rate of change (trending indicator)
    sentiment: Optional[float] = None  # -1 to 1 sentiment score
    
    # Metadata
    raw_data: Dict[str, Any] = field(default_factory=dict)
    fetched_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "source_type": self.source_type.value,
            "source_name": self.source_name,
            "query_used": self.query_used,
            "title": self.title,
            "description": self.description,
            "url": self.url,
            "relevance_score": self.relevance_score,
            "volume": self.volume,
            "velocity": self.velocity,
            "sentiment": self.sentiment,
            "raw_data": self.raw_data,
            "fetched_at": self.fetched_at.isoformat(),
        }


class DataProvider(ABC):
    """
    Abstract base class for all data providers.
    
    Each provider implements fetching from a specific API (Apify actor)
    and normalizes the results to MarketSignalData format.
    """
    
    name: str = "base_provider"
    signal_type: SignalType = SignalType.NEWS
    description: str = "Base data provider"
    
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token
        self._cache: Dict[str, Any] = {}
    
    @abstractmethod
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        """
        Fetch data from the source for a given query.
        
        Args:
            query: Search term (e.g., "lead qualification tool")
            **kwargs: Provider-specific options
            
        Returns:
            List of normalized MarketSignalData objects
        """
        pass
    
    @abstractmethod
    def get_actor_id(self) -> str:
        """Return the Apify actor ID for this provider."""
        pass
    
    def calculate_relevance(self, result: Dict[str, Any], query: str) -> float:
        """
        Calculate how relevant a result is to the query.
        Override for provider-specific relevance scoring.
        """
        title = str(result.get("title", "")).lower()
        description = str(result.get("description", "")).lower()
        query_terms = query.lower().split()
        
        matches = sum(1 for term in query_terms if term in title or term in description)
        return min(matches / len(query_terms), 1.0) if query_terms else 0.0
    
    def calculate_velocity(self, results: List[Dict], time_window_days: int = 30) -> float:
        """
        Calculate the rate of new results over time.
        Higher velocity = trending topic.
        """
        if not results:
            return 0.0
        return len(results) / time_window_days


class DataProviderManager:
    """
    Manages multiple data providers and orchestrates queries.
    
    Supports:
    - Registering providers by signal type
    - Running queries across multiple sources
    - Aggregating and scoring results
    """
    
    # Weights for multi-source confidence scoring
    SIGNAL_WEIGHTS = {
        SignalType.JOBS: 0.25,      # Highest: direct demand signal
        SignalType.NEWS: 0.15,      # Trending coverage
        SignalType.SOCIAL: 0.20,    # User discussions
        SignalType.DEVELOPER: 0.05, # Technical validation
        SignalType.ECOMMERCE: 0.05, # Market size proxy
        SignalType.SEARCH: 0.10,    # Search demand signals
        SignalType.REVIEWS: 0.10,   # Competitor sentiment
        SignalType.STARTUPS: 0.10,  # Competitive intelligence
    }
    
    def __init__(self):
        self._providers: Dict[SignalType, List[DataProvider]] = {
            signal_type: [] for signal_type in SignalType
        }
    
    def register(self, provider: DataProvider):
        """Register a data provider."""
        self._providers[provider.signal_type].append(provider)
        logger.info(f"Registered provider: {provider.name} ({provider.signal_type.value})")
    
    def get_providers(self, signal_type: Optional[SignalType] = None) -> List[DataProvider]:
        """Get all providers, optionally filtered by type."""
        if signal_type:
            return self._providers.get(signal_type, [])
        return [p for providers in self._providers.values() for p in providers]
    
    async def fetch_all(
        self, 
        query: str, 
        signal_types: Optional[List[SignalType]] = None,
        **kwargs
    ) -> List[MarketSignalData]:
        """
        Fetch data from all registered providers (or specified types).
        
        Args:
            query: Search term
            signal_types: Optional list of signal types to query
            **kwargs: Options passed to providers
            
        Returns:
            Combined list of signals from all sources
        """
        import asyncio
        
        types_to_query = signal_types or list(SignalType)
        all_signals: List[MarketSignalData] = []
        
        tasks = []
        for signal_type in types_to_query:
            for provider in self._providers.get(signal_type, []):
                tasks.append(self._safe_fetch(provider, query, **kwargs))
        
        results = await asyncio.gather(*tasks)
        for signals in results:
            all_signals.extend(signals)
        
        return all_signals
    
    async def _safe_fetch(
        self, 
        provider: DataProvider, 
        query: str, 
        **kwargs
    ) -> List[MarketSignalData]:
        """Fetch with error handling."""
        try:
            return await provider.fetch(query, **kwargs)
        except Exception as e:
            logger.error(f"Provider {provider.name} failed: {e}")
            return []
    
    def calculate_confidence_score(self, signals: List[MarketSignalData]) -> float:
        """
        Calculate a multi-source confidence score from 0-1.
        
        This weighs signals from different sources to produce
        a single confidence metric for market validation.
        """
        if not signals:
            return 0.0
        
        # Group signals by type and calculate weighted scores
        type_scores: Dict[SignalType, float] = {}
        type_counts: Dict[SignalType, int] = {}
        
        for signal in signals:
            signal_type = signal.source_type
            if signal_type not in type_scores:
                type_scores[signal_type] = 0.0
                type_counts[signal_type] = 0
            
            type_scores[signal_type] += signal.relevance_score
            type_counts[signal_type] += 1
        
        # Average scores per type, then weight
        total_score = 0.0
        for signal_type, score_sum in type_scores.items():
            avg_score = score_sum / type_counts[signal_type]
            weight = self.SIGNAL_WEIGHTS.get(signal_type, 0.1)
            total_score += avg_score * weight
        
        # Normalize to 0-1 range
        return min(total_score, 1.0)
    
    def summarize_signals(self, signals: List[MarketSignalData]) -> Dict[str, Any]:
        """
        Generate a summary of all signals for UI display.
        """
        summary = {
            "total_signals": len(signals),
            "confidence_score": self.calculate_confidence_score(signals),
            "by_type": {},
        }
        
        for signal_type in SignalType:
            type_signals = [s for s in signals if s.source_type == signal_type]
            if type_signals:
                summary["by_type"][signal_type.value] = {
                    "count": len(type_signals),
                    "avg_relevance": sum(s.relevance_score for s in type_signals) / len(type_signals),
                    "total_volume": sum(s.volume for s in type_signals),
                    "top_sources": list(set(s.source_name for s in type_signals)),
                }
        
        return summary
