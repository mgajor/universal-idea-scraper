#!/usr/bin/env python3
"""Simple Apify API test - minimal output."""
import os
import sys
import logging

# Suppress apify logs
logging.getLogger('apify_client').setLevel(logging.ERROR)

# Load .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

token = os.environ.get('APIFY_API_TOKEN', '')
print(f"Token: {token[:15]}...")

from apify_client import ApifyClient
client = ApifyClient(token)

# Account check
user = client.user().get()
print(f"Account: {user.get('username')} ({user.get('plan', {}).get('id', 'unknown')} plan)")

# Test: Cheerio Scraper (lightweight, fast)
print("\nTest: Cheerio Scraper (apify/cheerio-scraper)...")
try:
    run = client.actor("apify/cheerio-scraper").call(
        run_input={
            "startUrls": [{"url": "https://news.ycombinator.com"}],
            "pageFunction": """async function pageFunction(context) {
                const $ = context.$;
                const title = $('title').text();
                const links = [];
                $('a.titleline').each((i, el) => {
                    if (i < 5) links.push($(el).text());
                });
                return { title, top_links: links };
            }""",
            "maxRequestsPerCrawl": 1,
        },
        timeout_secs=120,
        memory_mbytes=128
    )
    items = client.dataset(run["defaultDatasetId"]).list_items().items
    print(f"✅ SUCCESS: Got {len(items)} result(s)")
    if items and items[0].get('top_links'):
        print(f"Top HN stories:")
        for link in items[0]['top_links'][:3]:
            print(f"  - {link[:60]}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\nTest complete!")
