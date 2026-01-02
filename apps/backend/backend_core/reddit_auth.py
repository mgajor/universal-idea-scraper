"""
Reddit OAuth Authentication Helper

Reddit now requires OAuth authentication for API access.
This module handles the Application-Only OAuth flow (script app).

To get credentials:
1. Go to https://www.reddit.com/prefs/apps
2. Click "create another app..." at the bottom
3. Select "script" type
4. Fill in name, description
5. For redirect URI, use: http://localhost:8080
6. Copy the client_id (under app name) and client_secret

Set these in your .env file:
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_username (optional)
REDDIT_PASSWORD=your_password (optional)
"""
import aiohttp
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class RedditToken:
    access_token: str
    token_type: str
    expires_at: datetime


class RedditAuth:
    """Handles Reddit OAuth authentication."""
    
    # Reddit OAuth endpoints
    TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
    API_BASE = "https://oauth.reddit.com"
    
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        user_agent: str = "RedditOpsConsole/1.0"
    ):
        self.client_id = client_id or os.getenv("REDDIT_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("REDDIT_CLIENT_SECRET", "")
        self.username = username or os.getenv("REDDIT_USERNAME", "")
        self.password = password or os.getenv("REDDIT_PASSWORD", "")
        self.user_agent = user_agent
        self._token: Optional[RedditToken] = None
    
    @property
    def is_configured(self) -> bool:
        """Check if OAuth credentials are configured."""
        return bool(self.client_id and self.client_secret)
    
    @property
    def has_user_credentials(self) -> bool:
        """Check if username/password are configured for user auth."""
        return bool(self.username and self.password)
    
    async def get_token(self) -> Optional[str]:
        """Get a valid access token, refreshing if needed."""
        if self._token and datetime.now() < self._token.expires_at:
            return self._token.access_token
        
        if not self.is_configured:
            print("[AUTH] No Reddit OAuth credentials configured")
            return None
        
        try:
            await self._fetch_token()
            return self._token.access_token if self._token else None
        except Exception as e:
            print(f"[AUTH] Failed to get token: {e}")
            return None
    
    async def _fetch_token(self):
        """Fetch a new OAuth token from Reddit."""
        auth = aiohttp.BasicAuth(self.client_id, self.client_secret)
        headers = {"User-Agent": self.user_agent}
        
        # Use password grant if user credentials available, otherwise client_credentials
        if self.has_user_credentials:
            data = {
                "grant_type": "password",
                "username": self.username,
                "password": self.password,
            }
        else:
            # Application-only OAuth (for public data only)
            data = {
                "grant_type": "client_credentials",
            }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.TOKEN_URL,
                auth=auth,
                headers=headers,
                data=data,
            ) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"OAuth failed: {response.status} - {text}")
                
                result = await response.json()
                
                self._token = RedditToken(
                    access_token=result["access_token"],
                    token_type=result["token_type"],
                    expires_at=datetime.now() + timedelta(seconds=result.get("expires_in", 3600) - 60),
                )
                print(f"[AUTH] Got OAuth token, expires at {self._token.expires_at}")
    
    async def get_session_headers(self) -> dict:
        """Get headers for authenticated API requests."""
        token = await self.get_token()
        
        headers = {
            "User-Agent": self.user_agent,
        }
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        return headers
    
    def get_api_base(self) -> str:
        """Get the API base URL - oauth for auth, www for fallback."""
        if self.is_configured:
            return self.API_BASE
        return "https://www.reddit.com"


# Global auth instance
reddit_auth = RedditAuth()
