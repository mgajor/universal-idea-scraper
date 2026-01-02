"""
Authentication middleware for Reddit Ops Console.

Provides optional API key authentication that can be enabled via AUTH_ENABLED env var.
When enabled, all routes require X-API-Key header matching AUTH_PASSWORD.
"""
from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from backend_config import get_settings


# API Key header - optional (won't error if missing, we check manually)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: Optional[str] = Security(api_key_header)) -> bool:
    """
    Verify the API key if authentication is enabled.
    
    - If AUTH_ENABLED=false: Always returns True (no auth required)
    - If AUTH_ENABLED=true: Requires valid X-API-Key header
    """
    settings = get_settings()
    
    # Auth disabled - allow all requests
    if not settings.auth_enabled:
        return True
    
    # Auth enabled - require valid API key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Include X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    if api_key != settings.auth_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key.",
        )
    
    return True


# Dependency to use in routers
require_auth = Depends(verify_api_key)
