"""
Problem Discovery Platform - Database Models

New models for search jobs, discovered problems, and AI insights.
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
import uuid
import enum

from backend_db.models import Base


class SearchStatus(str, enum.Enum):
    """Status of a search job."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class PlatformEnum(str, enum.Enum):
    """Platforms to search."""
    REDDIT = "reddit"
    HACKERNEWS = "hackernews"
    TWITTER = "twitter"
    INDIEHACKERS = "indiehackers"
    QUORA = "quora"
    PRODUCTHUNT = "producthunt"


class SearchJob(Base):
    """A search job configuration and status."""
    __tablename__ = "search_jobs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    
    # Search configuration
    keywords = Column(JSON, default=list)  # List of keywords to search
    platforms = Column(JSON, default=list)  # List of platforms
    max_results = Column(Integer, default=50)
    time_filter = Column(String(10), default="m")  # d=day, w=week, m=month, y=year
    
    # Status
    status = Column(String(20), default=SearchStatus.PENDING.value)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Results summary
    total_results = Column(Integer, default=0)
    results_analyzed = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    problems = relationship("DiscoveredProblem", back_populates="search_job", cascade="all, delete-orphan")


class DiscoveredProblem(Base):
    """A discovered problem/opportunity from search results."""
    __tablename__ = "discovered_problems"
    
    # Table-level indexes for common query patterns
    __table_args__ = (
        Index('ix_problems_platform_saved', 'platform', 'is_saved'),
        Index('ix_problems_saved_score', 'is_saved', 'opportunity_score'),
    )
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    search_job_id = Column(String, ForeignKey("search_jobs.id"), nullable=True)
    
    # Source info
    url = Column(String(2048), nullable=False, unique=True)
    title = Column(String(512), nullable=False)
    snippet = Column(Text, nullable=True)
    platform = Column(String(50), nullable=False, index=True)  # Added index
    keyword_matched = Column(String(255), nullable=True)
    
    # Engagement metrics (when available)
    upvotes = Column(Integer, nullable=True)
    comments_count = Column(Integer, nullable=True)
    
    # AI-generated scores (denormalized for fast filtering)
    opportunity_score = Column(Integer, nullable=True, index=True)  # 1-10, indexed for filtering
    category = Column(String(50), nullable=True, index=True)  # Category from AI analysis
    problem_summary = Column(Text, nullable=True)  # Summary from AI
    
    # User actions
    is_saved = Column(Boolean, default=False, index=True)  # Added index
    is_hidden = Column(Boolean, default=False, index=True)  # Added index
    notes = Column(Text, nullable=True)
    
    # Timestamps
    discovered_at = Column(DateTime, default=datetime.now, index=True)  # Added index for time-based queries
    source_date = Column(DateTime, nullable=True)  # When the original post was made
    
    # Relationships
    search_job = relationship("SearchJob", back_populates="problems")
    insight = relationship("ProblemInsight", back_populates="problem", uselist=False, cascade="all, delete-orphan")
    collections = relationship(
        "ProblemCollection",
        secondary="collection_problems",
        back_populates="problems",
    )


class ProblemInsight(Base):
    """AI-generated insights for a discovered problem with comprehensive market intelligence."""
    __tablename__ = "problem_insights"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String, ForeignKey("discovered_problems.id"), nullable=False, unique=True)
    
    # Core analysis
    category = Column(String(50), nullable=True)
    problem_summary = Column(Text, nullable=True)
    job_to_be_done = Column(Text, nullable=True)
    
    # Market signals
    opportunity_score = Column(Integer, default=5)  # 1-10
    score_reasoning = Column(Text, nullable=True)  # Explains the score
    demand_signals = Column(JSON, default=list)
    
    # Competitive Intelligence
    competitors = Column(JSON, default=list)  # Detailed competitor analysis
    market_gaps = Column(JSON, default=list)  # What no solution does well
    improvement_opportunities = Column(JSON, default=list)  # Specific areas to improve
    
    # Enhanced Market Analysis (NEW)
    market_sizing = Column(JSON, default=dict)  # TAM/SAM/SOM with methodology
    validation_metrics = Column(JSON, default=dict)  # Experiments and KPIs
    risk_assessment = Column(JSON, default=dict)  # Market, execution, competitive risks
    execution_roadmap = Column(JSON, default=dict)  # MVP/Launch/Scale phases
    comparable_exits = Column(JSON, default=list)  # Similar company exits/acquisitions
    
    # Legacy fields (kept for backward compatibility)
    existing_solutions = Column(JSON, default=list)
    solution_gaps = Column(JSON, default=list)
    market_size_estimate = Column(Text, nullable=True)  # Simple TAM/SAM estimate
    
    # Actionable insights (now support both string and dict formats)
    suggested_approaches = Column(JSON, default=list)
    target_audience = Column(JSON, nullable=True)  # Can be string or detailed dict
    monetization_potential = Column(JSON, nullable=True)  # Can be string or detailed dict
    recommended_next_steps = Column(JSON, default=list)
    
    # Meta
    model_used = Column(String(100), nullable=True)
    analyzed_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    problem = relationship("DiscoveredProblem", back_populates="insight")


# Junction table for many-to-many: Collection <-> Problem
from sqlalchemy import Table
collection_problems = Table(
    "collection_problems",
    Base.metadata,
    Column("collection_id", String, ForeignKey("problem_collections.id", ondelete="CASCADE"), primary_key=True),
    Column("problem_id", String, ForeignKey("discovered_problems.id", ondelete="CASCADE"), primary_key=True),
    Column("added_at", DateTime, default=datetime.now),
)


class ProblemCollection(Base):
    """A collection/project to organize saved problems."""
    __tablename__ = "problem_collections"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#6366f1")  # Hex color for UI
    icon = Column(String(50), default="folder")  # Icon name
    
    # Stats (denormalized for performance)
    problem_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships - many-to-many with problems
    problems = relationship(
        "DiscoveredProblem",
        secondary=collection_problems,
        back_populates="collections",
        lazy="dynamic"
    )


class SignalSourceType(str, enum.Enum):
    """Types of market signals from different sources."""
    JOBS = "jobs"
    NEWS = "news"
    SOCIAL = "social"
    DEVELOPER = "developer"
    ECOMMERCE = "ecommerce"


class MarketSignal(Base):
    """
    Market validation signal from external data sources.
    
    Stores signals from Jobs, News, Social Media, Developer Tools,
    and E-commerce APIs for multi-source validation.
    """
    __tablename__ = "market_signals"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String, ForeignKey("discovered_problems.id"), nullable=False)
    
    # Source identification
    source_type = Column(String(20), nullable=False)  # jobs, news, social, developer, ecommerce
    source_name = Column(String(100), nullable=False)  # e.g., "linkedin_jobs", "google_news"
    query_used = Column(String(255), nullable=True)    # The search query that found this
    
    # Core signal data
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(2048), nullable=True)
    
    # Signal metrics
    relevance_score = Column(Float, default=0.0)  # 0-1 relevance to problem
    volume = Column(Integer, default=0)            # Count (job postings, mentions, views)
    velocity = Column(Float, default=0.0)          # Rate of change (trending indicator)
    sentiment = Column(Float, nullable=True)       # -1 to 1 sentiment score
    
    # Raw data storage
    raw_data = Column(JSON, default=dict)
    
    # Timestamps
    fetched_at = Column(DateTime, default=datetime.now)
    source_date = Column(DateTime, nullable=True)  # When the source content was created
    
    # Relationship back to problem
    problem = relationship("DiscoveredProblem", backref="market_signals")


class MultiSourceValidation(Base):
    """
    Aggregated multi-source validation score for a problem.
    
    Stores the combined confidence score and signal summary
    after running multi-source enrichment.
    """
    __tablename__ = "multi_source_validations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String, ForeignKey("discovered_problems.id"), nullable=False, unique=True)
    
    # Aggregated scores
    confidence_score = Column(Float, default=0.0)  # 0-1 weighted confidence
    jobs_score = Column(Float, default=0.0)
    news_score = Column(Float, default=0.0)
    social_score = Column(Float, default=0.0)
    developer_score = Column(Float, default=0.0)
    ecommerce_score = Column(Float, default=0.0)
    search_score = Column(Float, default=0.0)
    reviews_score = Column(Float, default=0.0)
    startups_score = Column(Float, default=0.0)
    
    # Signal counts
    total_signals = Column(Integer, default=0)
    jobs_count = Column(Integer, default=0)
    news_count = Column(Integer, default=0)
    social_count = Column(Integer, default=0)
    developer_count = Column(Integer, default=0)
    ecommerce_count = Column(Integer, default=0)
    search_count = Column(Integer, default=0)
    reviews_count = Column(Integer, default=0)
    startups_count = Column(Integer, default=0)
    
    # Summary data
    top_sources = Column(JSON, default=list)
    summary = Column(JSON, default=dict)
    
    # AI Analysis (Perplexity/OpenRouter)
    ai_validation_summary = Column(Text, nullable=True)  # AI-generated narrative
    ai_confidence_score = Column(Integer, default=0)  # 0-100 AI confidence
    ai_confidence_explanation = Column(Text, nullable=True)  # Why this score
    ai_market_validation = Column(String(50), nullable=True)  # Strong/Moderate/Weak
    ai_key_insights = Column(JSON, default=dict)  # Insights by signal type
    ai_key_findings = Column(JSON, default=list)  # Top findings
    ai_red_flags = Column(JSON, default=list)  # Concerns
    ai_recommendations = Column(JSON, default=list)  # Action items
    ai_next_steps = Column(JSON, default=list)  # Immediate actions
    ai_analyzed_at = Column(DateTime, nullable=True)  # When AI analysis ran
    ai_model_used = Column(String(100), nullable=True)  # Model used for analysis
    
    # Timestamps
    validated_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    problem = relationship("DiscoveredProblem", backref="multi_source_validation")

