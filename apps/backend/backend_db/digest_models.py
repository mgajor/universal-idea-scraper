"""
Digest Settings Models

Database models for weekly digest email configuration.
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB

from .database import Base


class DigestSettings(Base):
    """User settings for weekly digest emails."""
    __tablename__ = "digest_settings"
    
    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    
    # Email configuration
    email = Column(String, nullable=True)
    is_enabled = Column(Boolean, default=False)
    
    # Schedule (day of week: 0=Monday, 6=Sunday)
    schedule_day = Column(Integer, default=0)  # Monday
    schedule_hour = Column(Integer, default=9)  # 9 AM
    
    # Content preferences
    min_opportunity_score = Column(Integer, default=6)  # Only include 6+ scores
    include_unanalyzed = Column(Boolean, default=False)
    max_problems = Column(Integer, default=20)  # Max problems per digest
    platforms = Column(JSON, default=list)  # Empty = all platforms
    
    # Tracking
    last_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f"<DigestSettings email={self.email} enabled={self.is_enabled}>"
