"""
Social Media Data Providers

Integrates with social platform APIs to fetch problem signals and discussions.
"""

from typing import Dict, List, Any, Optional
import logging

from .base import DataProvider, SignalType, MarketSignalData
from .apify_client import get_apify_client

logger = logging.getLogger(__name__)


class TwitterThreadProvider(DataProvider):
    """
    Twitter/X Thread Scraper integration.
    
    Tracks founder discussions and problem signals on Twitter.
    """
    
    name = "twitter_threads"
    signal_type = SignalType.SOCIAL
    description = "Twitter/X threads - founder and user discussions"
    
    def get_actor_id(self) -> str:
        return "apidojo/tweet-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchTerms": [query],
            "maxTweets": kwargs.get("limit", 50),
            "sort": "relevancy",
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=3600,  # 1 hour cache
        )
        
        signals = []
        for tweet in results:
            # Calculate engagement-weighted relevance
            likes = tweet.get("likeCount", 0)
            retweets = tweet.get("retweetCount", 0)
            replies = tweet.get("replyCount", 0)
            engagement = likes + (retweets * 2) + (replies * 3)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=tweet.get("text", "")[:100],
                description=tweet.get("text", ""),
                url=tweet.get("url"),
                relevance_score=self.calculate_relevance({"title": tweet.get("text", "")}, query),
                volume=engagement,
                raw_data={
                    "author": tweet.get("author", {}).get("username"),
                    "author_followers": tweet.get("author", {}).get("followersCount"),
                    "likes": likes,
                    "retweets": retweets,
                    "replies": replies,
                    "created_at": tweet.get("createdAt"),
                },
            ))
        
        return signals


class YouTubeTranscriptProvider(DataProvider):
    """
    YouTube Transcript Scraper integration.
    
    Finds "how-to" content demand for problems.
    High view counts on tutorials = validated demand.
    """
    
    name = "youtube_transcripts"
    signal_type = SignalType.SOCIAL
    description = "YouTube transcripts - how-to content demand"
    
    def get_actor_id(self) -> str:
        return "supreme_coder/youtube-transcript-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        # Search for tutorial/how-to content
        search_query = f"how to {query}" if not query.startswith("how to") else query
        
        run_input = {
            "searchQueries": [search_query],
            "maxResults": kwargs.get("limit", 20),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache
        )
        
        signals = []
        for video in results:
            views = video.get("viewCount", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=video.get("title", "Unknown"),
                description=video.get("description", "")[:500],
                url=video.get("url"),
                relevance_score=self.calculate_relevance(video, query),
                volume=views,  # Views as demand proxy
                raw_data={
                    "channel": video.get("channelName"),
                    "views": views,
                    "likes": video.get("likeCount"),
                    "duration": video.get("duration"),
                    "published_at": video.get("publishedAt"),
                    "transcript_preview": video.get("transcript", "")[:500],
                },
            ))
        
        return signals


class TikTokTrendProvider(DataProvider):
    """
    TikTok Trend Scraper integration.
    
    Tracks viral content and trending topics.
    """
    
    name = "tiktok_trends"
    signal_type = SignalType.SOCIAL
    description = "TikTok trends - viral signals and Gen-Z demand"
    
    def get_actor_id(self) -> str:
        return "clockworks/tiktok-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "hashtags": [query.replace(" ", "")],
            "maxItems": kwargs.get("limit", 30),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=3600,  # 1 hour cache (fast-moving platform)
        )
        
        signals = []
        for video in results:
            views = video.get("playCount", 0)
            likes = video.get("diggCount", 0)
            shares = video.get("shareCount", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=video.get("desc", "")[:100],
                description=video.get("desc", ""),
                url=video.get("webVideoUrl"),
                relevance_score=self.calculate_relevance({"title": video.get("desc", "")}, query),
                volume=views,
                raw_data={
                    "author": video.get("authorMeta", {}).get("name"),
                    "views": views,
                    "likes": likes,
                    "shares": shares,
                    "comments": video.get("commentCount"),
                    "hashtags": video.get("hashtags"),
                },
            ))
        
        return signals


class InstagramPostProvider(DataProvider):
    """
    Instagram Post Scraper integration.
    
    Tracks discussions and product mentions.
    """
    
    name = "instagram_posts"
    signal_type = SignalType.SOCIAL
    description = "Instagram posts - visual product demand"
    
    def get_actor_id(self) -> str:
        return "apify/instagram-hashtag-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        hashtag = query.replace(" ", "").lower()
        
        run_input = {
            "hashtags": [hashtag],
            "resultsLimit": kwargs.get("limit", 30),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=7200,  # 2 hour cache
        )
        
        signals = []
        for post in results:
            likes = post.get("likesCount", 0)
            comments = post.get("commentsCount", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=post.get("caption", "")[:100] if post.get("caption") else "No caption",
                description=post.get("caption", ""),
                url=post.get("url"),
                relevance_score=self.calculate_relevance({"title": post.get("caption", "")}, query),
                volume=likes + (comments * 2),
                raw_data={
                    "author": post.get("ownerUsername"),
                    "likes": likes,
                    "comments": comments,
                    "type": post.get("type"),
                    "timestamp": post.get("timestamp"),
                },
            ))
        
        return signals


class RedditScraperProvider(DataProvider):
    """
    Reddit SubReddit Scraper integration.
    
    Fetches posts and comments from relevant subreddits.
    Community discussions are gold for problem validation.
    """
    
    name = "reddit_discussions"
    signal_type = SignalType.SOCIAL
    description = "Reddit - community discussions and problem validation"
    
    def get_actor_id(self) -> str:
        return "agentx/subreddit-scraper"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        limit = kwargs.get("limit", 30)
        
        run_input = {
            "searchQuery": query,
            "maxPosts": limit,
            "includeComments": True,
            "sortBy": "relevance",
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=3600,  # 1 hour cache
        )
        
        signals = []
        for post in results:
            upvotes = post.get("score", 0) or post.get("ups", 0)
            comments = post.get("numComments", 0) or post.get("num_comments", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=post.get("title", "Unknown"),
                description=post.get("selftext", post.get("body", ""))[:500],
                url=post.get("url") or post.get("permalink"),
                relevance_score=self.calculate_relevance(post, query),
                volume=upvotes,
                velocity=comments,  # Comments indicate engagement
                raw_data={
                    "subreddit": post.get("subreddit"),
                    "author": post.get("author"),
                    "upvotes": upvotes,
                    "comments": comments,
                    "awards": post.get("awards"),
                    "created_utc": post.get("created_utc"),
                },
            ))
        
        return signals


class SocialTrendAnalyzer(DataProvider):
    """
    Social Media Trend Scraper 6-in-1 with AI Analysis.
    
    Multi-platform trend analysis from TikTok, Instagram, Twitter, 
    YouTube, Facebook, and LinkedIn in a single call.
    """
    
    name = "social_trends_6in1"
    signal_type = SignalType.SOCIAL
    description = "Multi-platform trend analysis with AI insights"
    
    def get_actor_id(self) -> str:
        return "manju4k/social-media-trend-scraper-6-in-1-ai-analysis"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchKeyword": query,
            "platforms": ["tiktok", "instagram", "twitter", "youtube"],
            "maxResults": kwargs.get("limit", 20),
            "includeAIAnalysis": True,
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=3600,  # 1 hour cache
        )
        
        signals = []
        for item in results:
            engagement = item.get("engagement", 0) or item.get("likes", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=item.get("title", item.get("text", ""))[:100],
                description=item.get("content", item.get("text", ""))[:500],
                url=item.get("url"),
                relevance_score=self.calculate_relevance(item, query),
                volume=engagement,
                raw_data={
                    "platform": item.get("platform"),
                    "engagement": engagement,
                    "sentiment": item.get("aiSentiment"),
                    "trend_score": item.get("trendScore"),
                    "ai_insights": item.get("aiInsights"),
                },
            ))
        
        return signals


class YouTubeCommentsProvider(DataProvider):
    """
    YouTube Channel Comment Collector integration.
    
    Fetches comments from relevant videos to gauge audience sentiment.
    """
    
    name = "youtube_comments"
    signal_type = SignalType.SOCIAL
    description = "YouTube comments - audience sentiment analysis"
    
    def get_actor_id(self) -> str:
        return "n.nobar/youtube-channel-comment-collector"
    
    async def fetch(self, query: str, **kwargs) -> List[MarketSignalData]:
        client = get_apify_client()
        
        run_input = {
            "searchQuery": query,
            "maxComments": kwargs.get("limit", 50),
        }
        
        results = await client.run_actor(
            self.get_actor_id(),
            run_input,
            cache_ttl=86400,  # 24 hour cache
        )
        
        signals = []
        for comment in results:
            likes = comment.get("likeCount", 0)
            
            signals.append(MarketSignalData(
                source_type=self.signal_type,
                source_name=self.name,
                query_used=query,
                title=comment.get("text", "")[:100],
                description=comment.get("text", ""),
                url=comment.get("videoUrl"),
                relevance_score=self.calculate_relevance({"title": comment.get("text", "")}, query),
                volume=likes,
                sentiment=comment.get("sentiment"),  # If available
                raw_data={
                    "author": comment.get("author"),
                    "likes": likes,
                    "video_title": comment.get("videoTitle"),
                    "channel": comment.get("channelName"),
                    "published_at": comment.get("publishedAt"),
                },
            ))
        
        return signals


def get_social_providers() -> List[DataProvider]:
    """Get all social media providers."""
    return [
        TwitterThreadProvider(),
        YouTubeTranscriptProvider(),
        TikTokTrendProvider(),
        InstagramPostProvider(),
        RedditScraperProvider(),
        SocialTrendAnalyzer(),
        YouTubeCommentsProvider(),
    ]

