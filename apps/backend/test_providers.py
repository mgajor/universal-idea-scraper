#!/usr/bin/env python3
"""
Standalone test script for Multi-Source Data Providers.

Tests Apify actors directly without needing the full backend running.
Run this from the apps/backend directory.
"""

import asyncio
import os
import sys
from datetime import datetime

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load env
from dotenv import load_dotenv
load_dotenv()


async def test_apify_client():
    """Test basic Apify client configuration."""
    print("\n" + "="*60)
    print("TEST 1: Apify Client Configuration")
    print("="*60)
    
    from data_providers.apify_client import ApifyClientWrapper
    
    client = ApifyClientWrapper()
    
    print(f"  API Token present: {bool(client.api_token)}")
    print(f"  Token prefix: {client.api_token[:10]}..." if client.api_token else "  Token: NOT SET")
    print(f"  Client configured: {client.is_configured}")
    print(f"  Rate limit: {client.rate_limit} req/min")
    print(f"  Cache TTL: {client.cache_ttl}s")
    
    return client.is_configured


async def test_google_news(query="lead qualification automation"):
    """Test Google News scraper."""
    print("\n" + "="*60)
    print(f"TEST 2: Google News Scraper")
    print(f"  Query: '{query}'")
    print("="*60)
    
    from data_providers.news import GoogleNewsProvider
    
    provider = GoogleNewsProvider()
    print(f"  Actor ID: {provider.get_actor_id()}")
    
    try:
        signals = await provider.fetch(query, limit=5)
        print(f"  ✅ SUCCESS: Got {len(signals)} signals")
        
        for i, s in enumerate(signals[:3], 1):
            print(f"\n  [{i}] {s.title[:60]}...")
            print(f"      Source: {s.raw_data.get('source', 'N/A')}")
            print(f"      Relevance: {s.relevance_score:.2f}")
            
        return True
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_product_hunt(query="automation"):
    """Test Product Hunt scraper."""
    print("\n" + "="*60)
    print(f"TEST 3: Product Hunt Scraper")
    print(f"  Query: '{query}'")
    print("="*60)
    
    from data_providers.news import ProductHuntProvider
    
    provider = ProductHuntProvider()
    print(f"  Actor ID: {provider.get_actor_id()}")
    
    try:
        signals = await provider.fetch(query, limit=5)
        print(f"  ✅ SUCCESS: Got {len(signals)} signals")
        
        for i, s in enumerate(signals[:3], 1):
            print(f"\n  [{i}] {s.title}")
            print(f"      Votes: {s.raw_data.get('votes', 0)}")
            print(f"      URL: {s.url}")
            
        return True
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_youtube_transcripts(query="lead generation tutorial"):
    """Test YouTube Transcript scraper."""
    print("\n" + "="*60)
    print(f"TEST 4: YouTube Transcript Scraper")
    print(f"  Query: 'how to {query}'")
    print("="*60)
    
    from data_providers.social import YouTubeTranscriptProvider
    
    provider = YouTubeTranscriptProvider()
    print(f"  Actor ID: {provider.get_actor_id()}")
    
    try:
        signals = await provider.fetch(query, limit=5)
        print(f"  ✅ SUCCESS: Got {len(signals)} signals")
        
        for i, s in enumerate(signals[:3], 1):
            print(f"\n  [{i}] {s.title[:60]}...")
            print(f"      Views: {s.volume:,}")
            print(f"      Channel: {s.raw_data.get('channel', 'N/A')}")
            
        return True
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_rss_feeds():
    """Test RSS Feed scraper."""
    print("\n" + "="*60)
    print(f"TEST 5: RSS Feed Scraper (Hacker News)")
    print("="*60)
    
    from data_providers.news import RSSFeedProvider
    
    provider = RSSFeedProvider()
    print(f"  Actor ID: {provider.get_actor_id()}")
    
    try:
        # RSS feed doesn't need a query per se, we filter results
        signals = await provider.fetch("automation", limit=10)
        print(f"  ✅ SUCCESS: Got {len(signals)} matching signals")
        
        for i, s in enumerate(signals[:3], 1):
            print(f"\n  [{i}] {s.title[:60]}...")
            print(f"      Feed: {s.raw_data.get('feed', 'N/A')}")
            
        return True
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def test_provider_manager():
    """Test running the full provider manager."""
    print("\n" + "="*60)
    print("TEST 6: DataProviderManager (Multi-Source)")
    print("="*60)
    
    from data_providers.base import DataProviderManager, SignalType
    from data_providers.news import get_news_providers
    
    manager = DataProviderManager()
    
    # Register just news providers for this test
    for provider in get_news_providers():
        manager.register(provider)
    
    print(f"  Registered providers: {len(manager.get_providers())}")
    
    try:
        signals = await manager.fetch_all(
            "lead qualification tool",
            signal_types=[SignalType.NEWS],
            limit=5,
        )
        
        print(f"  ✅ SUCCESS: Got {len(signals)} total signals")
        
        summary = manager.summarize_signals(signals)
        print(f"\n  Confidence Score: {summary['confidence_score']:.2f}")
        print(f"  By Type: {summary['by_type']}")
        
        return True
    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        return False


async def main():
    """Run all tests."""
    print("\n" + "#"*60)
    print("#  MULTI-SOURCE DATA PROVIDER TEST SUITE")
    print("#  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("#"*60)
    
    results = {}
    
    # Test 1: Client config
    results["client"] = await test_apify_client()
    
    if not results["client"]:
        print("\n⚠️  Apify client not configured. Set APIFY_API_TOKEN in .env")
        print("   Skipping remaining tests.")
        return
    
    # Test 2-5: Individual providers (pick 4)
    results["google_news"] = await test_google_news()
    await asyncio.sleep(1)  # Rate limit buffer
    
    results["product_hunt"] = await test_product_hunt()
    await asyncio.sleep(1)
    
    results["youtube"] = await test_youtube_transcripts()
    await asyncio.sleep(1)
    
    results["rss"] = await test_rss_feeds()
    await asyncio.sleep(1)
    
    # Test 6: Full manager
    results["manager"] = await test_provider_manager()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test}: {status}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Data provider system is ready.")
    else:
        print("\n⚠️  Some tests failed. Check errors above.")


if __name__ == "__main__":
    asyncio.run(main())
