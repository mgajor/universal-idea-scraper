"""
Reddit Ops Console - Database Models
SQLAlchemy models for jobs, runs, posts, comments, and exports.
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, 
    ForeignKey, JSON, Index, Enum as SQLEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
from sqlalchemy.sql import func
import uuid


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


class JobStatus(str, Enum):
    """Job status enum."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class JobMode(str, Enum):
    """Scraping mode enum."""
    FULL = "full"
    HISTORY = "history"
    MONITOR = "monitor"


class Job(Base):
    """Job configuration - defines what to scrape and how."""
    __tablename__ = "jobs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target: Mapped[str] = mapped_column(String(255), nullable=False)  # subreddit or username
    is_user: Mapped[bool] = mapped_column(Boolean, default=False)
    mode: Mapped[str] = mapped_column(String(20), default=JobMode.FULL.value)
    limit: Mapped[int] = mapped_column(Integer, default=100)
    
    # Options
    download_media: Mapped[bool] = mapped_column(Boolean, default=True)
    scrape_comments: Mapped[bool] = mapped_column(Boolean, default=True)
    use_plugins: Mapped[bool] = mapped_column(Boolean, default=False)
    dedupe: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Schedule (cron-style, null = manual only)
    schedule: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Plugin configuration
    plugins_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Notifications
    notify_discord: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notify_telegram: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metadata
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    runs: Mapped[List["JobRun"]] = relationship("JobRun", back_populates="job", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_jobs_target", "target"),
        Index("idx_jobs_enabled", "enabled"),
    )


class JobRun(Base):
    """Individual job run instance - tracks execution of a job."""
    __tablename__ = "job_runs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    
    # Status
    status: Mapped[str] = mapped_column(String(20), default=JobStatus.PENDING.value)
    
    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Metrics
    posts_scraped: Mapped[int] = mapped_column(Integer, default=0)
    comments_scraped: Mapped[int] = mapped_column(Integer, default=0)
    media_downloaded: Mapped[int] = mapped_column(Integer, default=0)
    
    # Progress tracking
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    current_item: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    items_per_minute: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    eta_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Checkpoint for resume
    checkpoint_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="runs")
    logs: Mapped[List["JobLog"]] = relationship("JobLog", back_populates="run", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_runs_job_id", "job_id"),
        Index("idx_runs_status", "status"),
        Index("idx_runs_started_at", "started_at"),
    )


class JobLog(Base):
    """Log entries for a job run."""
    __tablename__ = "job_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("job_runs.id"), nullable=False)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    level: Mapped[str] = mapped_column(String(10), default="INFO")  # DEBUG, INFO, WARN, ERROR
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Optional structured data
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    run: Mapped["JobRun"] = relationship("JobRun", back_populates="logs")
    
    __table_args__ = (
        Index("idx_logs_run_id", "run_id"),
        Index("idx_logs_timestamp", "timestamp"),
    )


class Post(Base):
    """Scraped Reddit post."""
    __tablename__ = "posts"
    
    id: Mapped[str] = mapped_column(String(20), primary_key=True)  # Reddit post ID
    subreddit: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(100), nullable=True)
    
    created_utc: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    permalink: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    score: Mapped[int] = mapped_column(Integer, default=0)
    upvote_ratio: Mapped[float] = mapped_column(Float, default=0)
    num_comments: Mapped[int] = mapped_column(Integer, default=0)
    num_crossposts: Mapped[int] = mapped_column(Integer, default=0)
    
    selftext: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    post_type: Mapped[str] = mapped_column(String(20), default="text")  # text, image, video, gallery, link
    
    is_nsfw: Mapped[bool] = mapped_column(Boolean, default=False)
    is_spoiler: Mapped[bool] = mapped_column(Boolean, default=False)
    flair: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    total_awards: Mapped[int] = mapped_column(Integer, default=0)
    
    has_media: Mapped[bool] = mapped_column(Boolean, default=False)
    media_downloaded: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Plugin outputs
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    keywords: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    
    # Metadata
    source: Mapped[str] = mapped_column(String(50), default="scraper")
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    run_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    
    # Relationships
    comments: Mapped[List["Comment"]] = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_posts_subreddit", "subreddit"),
        Index("idx_posts_author", "author"),
        Index("idx_posts_created_utc", "created_utc"),
        Index("idx_posts_score", "score"),
        Index("idx_posts_post_type", "post_type"),
    )


class Comment(Base):
    """Scraped Reddit comment."""
    __tablename__ = "comments"
    
    id: Mapped[str] = mapped_column(String(20), primary_key=True)  # Reddit comment ID
    post_id: Mapped[str] = mapped_column(String(20), ForeignKey("posts.id"), nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    author: Mapped[str] = mapped_column(String(100), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0)
    
    created_utc: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    is_submitter: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Plugin outputs
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Metadata
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    run_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    
    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="comments")
    
    __table_args__ = (
        Index("idx_comments_post_id", "post_id"),
        Index("idx_comments_author", "author"),
        Index("idx_comments_score", "score"),
    )


class Export(Base):
    """Export job history."""
    __tablename__ = "exports"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(20), nullable=False)  # csv, json, parquet
    
    # Query parameters used
    filters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    columns: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    
    # Result
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    row_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timing
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    __table_args__ = (
        Index("idx_exports_created_at", "created_at"),
    )


class PluginConfig(Base):
    """Plugin configuration storage."""
    __tablename__ = "plugin_configs"
    
    name: Mapped[str] = mapped_column(String(100), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Run history
    last_run: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    run_count: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
