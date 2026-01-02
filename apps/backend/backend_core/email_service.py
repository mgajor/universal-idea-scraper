"""
Email Service - Resend Integration

Sends weekly digest emails using Resend API.
https://resend.com
"""
import os
import aiohttp
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class EmailResult:
    """Result of sending an email."""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class EmailService:
    """
    Email sending service using Resend API.
    
    Set RESEND_API_KEY environment variable.
    Optional: Set RESEND_FROM_EMAIL for sender address.
    """
    
    API_BASE = "https://api.resend.com"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        from_email: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("RESEND_API_KEY", "")
        self.from_email = from_email or os.getenv(
            "RESEND_FROM_EMAIL", 
            "Market Insights <insights@resend.dev>"
        )
    
    @property
    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return bool(self.api_key)
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None,
    ) -> EmailResult:
        """Send an email via Resend API."""
        if not self.is_configured:
            return EmailResult(
                success=False,
                error="RESEND_API_KEY not configured"
            )
        
        payload = {
            "from": self.from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        
        if text:
            payload["text"] = text
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.API_BASE}/emails",
                    json=payload,
                    headers=headers,
                ) as response:
                    data = await response.json()
                    
                    if response.status == 200:
                        return EmailResult(
                            success=True,
                            message_id=data.get("id"),
                        )
                    else:
                        return EmailResult(
                            success=False,
                            error=data.get("message", f"HTTP {response.status}"),
                        )
        except Exception as e:
            return EmailResult(
                success=False,
                error=str(e),
            )
    
    async def send_digest(
        self,
        to: str,
        problems: List[Dict[str, Any]],
        stats: Dict[str, Any],
        period_days: int = 7,
    ) -> EmailResult:
        """Send a weekly digest email with discovered problems."""
        
        # Format date
        date_str = datetime.now().strftime("%B %d, %Y")
        
        # Build problems HTML
        problems_html = ""
        for p in problems[:15]:
            score = p.get("opportunity_score", 0)
            score_color = "#10b981" if score >= 7 else "#f59e0b" if score >= 5 else "#64748b"
            
            problems_html += f"""
            <tr>
                <td style="padding: 16px; border-bottom: 1px solid #334155;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 32px; height: 32px; background: {score_color}; border-radius: 8px; color: white; font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                            {score}
                        </div>
                        <div>
                            <div style="color: #e2e8f0; font-size: 14px; margin-bottom: 4px;">{p.get('title', '')[:60]}...</div>
                            <div style="color: #64748b; font-size: 12px;">{p.get('platform', '')} • {p.get('category', 'uncategorized')}</div>
                        </div>
                    </div>
                </td>
            </tr>
            """
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 40px;">
                    <h1 style="color: #818cf8; margin: 0 0 8px 0; font-size: 28px;">📊 Weekly Market Insights</h1>
                    <p style="color: #64748b; margin: 0; font-size: 14px;">{date_str} • Last {period_days} days</p>
                </div>
                
                <!-- Stats -->
                <div style="display: flex; gap: 16px; margin-bottom: 32px;">
                    <div style="flex: 1; background: #1e293b; border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #818cf8;">{stats.get('total_discovered', 0)}</div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Discovered</div>
                    </div>
                    <div style="flex: 1; background: #1e293b; border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #a78bfa;">{stats.get('total_analyzed', 0)}</div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Analyzed</div>
                    </div>
                    <div style="flex: 1; background: #1e293b; border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">{stats.get('high_potential', 0)}</div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">High Potential</div>
                    </div>
                </div>
                
                <!-- Problems Table -->
                <div style="background: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
                    <div style="padding: 16px 20px; border-bottom: 1px solid #334155;">
                        <h2 style="margin: 0; color: #e2e8f0; font-size: 16px;">🔥 Top Opportunities</h2>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        {problems_html}
                    </table>
                </div>
                
                <!-- CTA -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="#" style="display: inline-block; background: #818cf8; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        View All Opportunities →
                    </a>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; color: #475569; font-size: 12px;">
                    <p>You're receiving this because you enabled weekly digests.</p>
                    <p>Reddit Ops Console • Market Validation Toolkit</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = f"📊 {len(problems)} New Opportunities This Week | Market Insights"
        
        return await self.send_email(to=to, subject=subject, html=html)


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get the email service singleton."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
