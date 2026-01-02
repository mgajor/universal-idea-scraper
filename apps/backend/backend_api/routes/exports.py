from datetime import datetime
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from backend_db import get_session, Post, Comment, Export
from backend_config import get_settings

router = APIRouter(prefix="/exports", tags=["Exports"])


# --- Schemas ---

class ExportCreate(BaseModel):
    name: str
    format: str  # csv, json, parquet
    filters: Optional[dict] = None
    columns: Optional[List[str]] = None


class ExportResponse(BaseModel):
    id: str
    name: str
    format: str
    status: str
    file_path: Optional[str]
    file_size_bytes: Optional[int]
    row_count: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]
    
    class Config:
        from_attributes = True


# --- Background Task ---

async def run_export(export_id: str, filters: dict, columns: List[str], format: str):
    """Background task to generate export file."""
    from ..db import get_session_context
    import pandas as pd
    
    settings = get_settings()
    exports_dir = settings.exports_dir
    exports_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        async with get_session_context() as session:
            # Build query
            query = select(Post)
            
            # Apply filters
            if filters:
                if filters.get("subreddit"):
                    # Escape SQL wildcards to prevent injection
                    escaped = filters['subreddit'].replace('%', '\\%').replace('_', '\\_')
                    query = query.where(Post.subreddit.ilike(f"%{escaped}%"))
                if filters.get("min_score") is not None:
                    query = query.where(Post.score >= filters["min_score"])
                if filters.get("start_date"):
                    query = query.where(Post.created_utc >= filters["start_date"])
                if filters.get("end_date"):
                    query = query.where(Post.created_utc <= filters["end_date"])
                if filters.get("post_type"):
                    query = query.where(Post.post_type == filters["post_type"])
            
            result = await session.execute(query)
            posts = result.scalars().all()
            
            # Convert to DataFrame
            data = []
            for post in posts:
                row = {
                    "id": post.id,
                    "subreddit": post.subreddit,
                    "title": post.title,
                    "author": post.author,
                    "created_utc": post.created_utc,
                    "permalink": post.permalink,
                    "url": post.url,
                    "score": post.score,
                    "upvote_ratio": post.upvote_ratio,
                    "num_comments": post.num_comments,
                    "selftext": post.selftext,
                    "post_type": post.post_type,
                    "is_nsfw": post.is_nsfw,
                    "flair": post.flair,
                    "has_media": post.has_media,
                    "sentiment_score": post.sentiment_score,
                    "sentiment_label": post.sentiment_label,
                }
                
                # Filter columns if specified
                if columns:
                    row = {k: v for k, v in row.items() if k in columns}
                
                data.append(row)
            
            df = pd.DataFrame(data)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"export_{export_id[:8]}_{timestamp}.{format}"
            file_path = exports_dir / filename
            
            # Export to format
            if format == "csv":
                df.to_csv(file_path, index=False)
            elif format == "json":
                df.to_json(file_path, orient="records", indent=2)
            elif format == "parquet":
                df.to_parquet(file_path, index=False)
            
            # Update export record
            file_size = file_path.stat().st_size
            
            export_result = await session.execute(select(Export).where(Export.id == export_id))
            export = export_result.scalar_one()
            export.status = "completed"
            export.file_path = str(file_path)
            export.file_size_bytes = file_size
            export.row_count = len(data)
            export.completed_at = datetime.now()
            await session.commit()
            
    except Exception as e:
        async with get_session_context() as session:
            export_result = await session.execute(select(Export).where(Export.id == export_id))
            export = export_result.scalar_one_or_none()
            if export:
                export.status = "failed"
                export.error_message = str(e)
                export.completed_at = datetime.now()
                await session.commit()


# --- Routes ---

@router.post("", response_model=ExportResponse)
async def create_export(
    export_data: ExportCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    """Create a new export job."""
    if export_data.format not in ["csv", "json", "parquet"]:
        raise HTTPException(status_code=400, detail="Invalid format. Use: csv, json, parquet")
    
    # Create export record
    export = Export(
        name=export_data.name,
        format=export_data.format,
        filters=export_data.filters,
        columns=export_data.columns,
        status="pending",
    )
    
    session.add(export)
    await session.commit()
    await session.refresh(export)
    
    # Start background export task
    background_tasks.add_task(
        run_export,
        export.id,
        export_data.filters or {},
        export_data.columns or [],
        export_data.format,
    )
    
    return ExportResponse.model_validate(export)


@router.get("", response_model=List[ExportResponse])
async def list_exports(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    """List all exports."""
    query = select(Export)
    
    if status:
        query = query.where(Export.status == status)
    
    query = query.order_by(desc(Export.created_at)).limit(limit)
    
    result = await session.execute(query)
    exports = result.scalars().all()
    
    return [ExportResponse.model_validate(e) for e in exports]


@router.get("/{export_id}", response_model=ExportResponse)
async def get_export(
    export_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get export by ID."""
    result = await session.execute(select(Export).where(Export.id == export_id))
    export = result.scalar_one_or_none()
    
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    
    return ExportResponse.model_validate(export)


@router.get("/{export_id}/download")
async def download_export(
    export_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Download export file."""
    result = await session.execute(select(Export).where(Export.id == export_id))
    export = result.scalar_one_or_none()
    
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    
    if export.status != "completed":
        raise HTTPException(status_code=400, detail=f"Export not ready. Status: {export.status}")
    
    if not export.file_path or not Path(export.file_path).exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    
    # Determine media type
    media_types = {
        "csv": "text/csv",
        "json": "application/json",
        "parquet": "application/octet-stream",
    }
    
    return FileResponse(
        path=export.file_path,
        media_type=media_types.get(export.format, "application/octet-stream"),
        filename=Path(export.file_path).name,
    )


@router.delete("/{export_id}")
async def delete_export(
    export_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Delete export and its file."""
    result = await session.execute(select(Export).where(Export.id == export_id))
    export = result.scalar_one_or_none()
    
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    
    # Delete file if exists
    if export.file_path:
        file_path = Path(export.file_path)
        if file_path.exists():
            file_path.unlink()
    
    await session.delete(export)
    await session.commit()
    
    return {"message": "Export deleted", "id": export_id}


# --- Discovery Problems Export ---

from backend_db.discovery_models import DiscoveredProblem, ProblemInsight


class DiscoveryExportParams(BaseModel):
    """Parameters for exporting discovered problems."""
    format: str = "csv"  # csv, json
    platform: Optional[str] = None
    min_score: Optional[int] = None
    only_analyzed: bool = False
    only_saved: bool = False
    include_insights: bool = True


@router.post("/discovery/export")
async def export_discovery_problems(
    params: DiscoveryExportParams,
    session: AsyncSession = Depends(get_session),
):
    """Export discovered problems to CSV or JSON (instant download)."""
    from sqlalchemy.orm import selectinload
    import json
    import io
    import csv
    from fastapi.responses import StreamingResponse
    
    # Build query
    query = (
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(DiscoveredProblem.is_hidden == False)
    )
    
    # Apply filters
    if params.platform:
        query = query.where(DiscoveredProblem.platform == params.platform)
    if params.only_saved:
        query = query.where(DiscoveredProblem.is_saved == True)
    
    query = query.order_by(desc(DiscoveredProblem.discovered_at))
    
    result = await session.execute(query)
    problems = result.scalars().all()
    
    # Filter by score (post-query since score is in related table)
    if params.min_score is not None:
        problems = [p for p in problems if p.insight and p.insight.opportunity_score >= params.min_score]
    
    if params.only_analyzed:
        problems = [p for p in problems if p.insight is not None]
    
    # Build data rows
    rows = []
    for p in problems:
        row = {
            "id": p.id,
            "title": p.title,
            "platform": p.platform,
            "url": p.url,
            "snippet": p.snippet or "",
            "is_saved": p.is_saved,
            "discovered_at": p.discovered_at.isoformat() if p.discovered_at else "",
        }
        
        if params.include_insights and p.insight:
            row.update({
                "opportunity_score": p.insight.opportunity_score,
                "category": p.insight.category,
                "problem_summary": p.insight.problem_summary or "",
                "job_to_be_done": p.insight.job_to_be_done or "",
                "target_audience": p.insight.target_audience or "",
                "market_size_estimate": p.insight.market_size_estimate or "",
                "monetization_potential": p.insight.monetization_potential or "",
            })
        elif params.include_insights:
            row.update({
                "opportunity_score": "",
                "category": "",
                "problem_summary": "",
                "job_to_be_done": "",
                "target_audience": "",
                "market_size_estimate": "",
                "monetization_potential": "",
            })
        
        rows.append(row)
    
    # Generate file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if params.format == "json":
        content = json.dumps(rows, indent=2, ensure_ascii=False)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=problems_export_{timestamp}.json"}
        )
    else:
        # CSV
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=problems_export_{timestamp}.csv"}
        )


@router.get("/discovery/report")
async def generate_discovery_report(
    days: int = Query(7, ge=1, le=90, description="Days to include in report"),
    session: AsyncSession = Depends(get_session),
):
    """Generate a summary report of discovered problems (HTML format)."""
    from datetime import timedelta
    from sqlalchemy.orm import selectinload
    from sqlalchemy import func
    from fastapi.responses import HTMLResponse
    from html import escape  # XSS protection
    
    cutoff = datetime.now() - timedelta(days=days)
    
    # Get problems
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(
            DiscoveredProblem.discovered_at >= cutoff,
            DiscoveredProblem.is_hidden == False,
        )
        .order_by(desc(DiscoveredProblem.discovered_at))
    )
    problems = result.scalars().all()
    
    # Calculate stats
    total = len(problems)
    analyzed = [p for p in problems if p.insight]
    saved = [p for p in problems if p.is_saved]
    high_score = [p for p in analyzed if p.insight.opportunity_score >= 7]
    
    avg_score = sum(p.insight.opportunity_score for p in analyzed) / len(analyzed) if analyzed else 0
    
    # Platform breakdown
    platform_counts = {}
    for p in problems:
        platform_counts[p.platform] = platform_counts.get(p.platform, 0) + 1
    
    # Category breakdown
    category_counts = {}
    for p in analyzed:
        cat = p.insight.category or "uncategorized"
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    # Top problems
    top_problems = sorted(analyzed, key=lambda x: x.insight.opportunity_score, reverse=True)[:10]
    
    # Build HTML report
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Problem Discovery Report - Last {days} Days</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #0f172a; color: #e2e8f0; }}
            h1 {{ color: #818cf8; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }}
            h2 {{ color: #a5b4fc; margin-top: 40px; }}
            .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }}
            .stat {{ background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; }}
            .stat-value {{ font-size: 36px; font-weight: bold; color: #818cf8; }}
            .stat-label {{ font-size: 12px; color: #94a3b8; text-transform: uppercase; }}
            table {{ width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; }}
            th {{ background: #334155; color: #e2e8f0; text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; }}
            td {{ padding: 12px 16px; border-top: 1px solid #334155; }}
            tr:hover td {{ background: #334155; }}
            .score {{ display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 8px; font-weight: bold; }}
            .score-high {{ background: #10b981; color: white; }}
            .score-mid {{ background: #f59e0b; color: white; }}
            .score-low {{ background: #64748b; color: white; }}
            .platform {{ background: #4f46e5; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; }}
            .breakdown {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }}
            .breakdown-item {{ display: flex; justify-between; padding: 8px 0; border-bottom: 1px solid #334155; }}
        </style>
    </head>
    <body>
        <h1>📊 Problem Discovery Report</h1>
        <p>Generated on {datetime.now().strftime('%B %d, %Y at %H:%M')} • Last {days} days</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">{total}</div>
                <div class="stat-label">Total Problems</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(analyzed)}</div>
                <div class="stat-label">AI Analyzed</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(high_score)}</div>
                <div class="stat-label">High Potential (7+)</div>
            </div>
            <div class="stat">
                <div class="stat-value">{avg_score:.1f}</div>
                <div class="stat-label">Avg Score</div>
            </div>
        </div>
        
        <h2>📈 Breakdown</h2>
        <div class="breakdown">
            <div>
                <h3>By Platform</h3>
                {"".join(f'<div class="breakdown-item"><span>{k}</span><strong>{v}</strong></div>' for k, v in sorted(platform_counts.items(), key=lambda x: -x[1])[:6])}
            </div>
            <div>
                <h3>By Category</h3>
                {"".join(f'<div class="breakdown-item"><span>{k}</span><strong>{v}</strong></div>' for k, v in sorted(category_counts.items(), key=lambda x: -x[1])[:6])}
            </div>
        </div>
        
        <h2>🔥 Top Opportunities</h2>
        <table>
            <tr>
                <th>Score</th>
                <th>Platform</th>
                <th>Problem</th>
                <th>Category</th>
            </tr>
            {"".join(f'''
            <tr>
                <td><span class="score {"score-high" if p.insight.opportunity_score >= 7 else "score-mid" if p.insight.opportunity_score >= 5 else "score-low"}">{p.insight.opportunity_score}</span></td>
                <td><span class="platform">{escape(p.platform)}</span></td>
                <td>{escape(p.title[:80])}{"..." if len(p.title) > 80 else ""}</td>
                <td>{escape(p.insight.category or "-")}</td>
            </tr>
            ''' for p in top_problems)}
        </table>
        
        <p style="margin-top: 40px; color: #64748b; font-size: 12px;">
            Report generated by Reddit Ops Console • Market Validation Toolkit
        </p>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)


@router.get("/discovery/pdf")
async def download_pdf_report(
    days: int = Query(7, ge=1, le=90, description="Days to include in report"),
    session: AsyncSession = Depends(get_session),
):
    """Generate a PDF-ready report (saves as HTML file optimized for print/PDF)."""
    from datetime import timedelta
    from sqlalchemy.orm import selectinload
    from fastapi.responses import StreamingResponse
    from html import escape  # XSS protection
    import io
    
    cutoff = datetime.now() - timedelta(days=days)
    
    # Get problems
    result = await session.execute(
        select(DiscoveredProblem)
        .options(selectinload(DiscoveredProblem.insight))
        .where(
            DiscoveredProblem.discovered_at >= cutoff,
            DiscoveredProblem.is_hidden == False,
        )
        .order_by(desc(DiscoveredProblem.discovered_at))
    )
    problems = result.scalars().all()
    
    # Calculate stats
    total = len(problems)
    analyzed = [p for p in problems if p.insight]
    high_score = [p for p in analyzed if p.insight.opportunity_score >= 7]
    avg_score = sum(p.insight.opportunity_score for p in analyzed) / len(analyzed) if analyzed else 0
    
    # Platform breakdown
    platform_counts = {}
    for p in problems:
        platform_counts[p.platform] = platform_counts.get(p.platform, 0) + 1
    
    # Top problems
    top_problems = sorted(analyzed, key=lambda x: x.insight.opportunity_score, reverse=True)[:20]
    
    # Build PDF-optimized HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Problem Discovery Report - Last {days} Days</title>
        <style>
            @page {{ size: A4; margin: 20mm; }}
            @media print {{ body {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }} }}
            * {{ box-sizing: border-box; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1e293b; line-height: 1.5; }}
            h1 {{ color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 8px; font-size: 28px; }}
            h2 {{ color: #334155; margin-top: 32px; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }}
            .meta {{ color: #64748b; font-size: 14px; margin-bottom: 32px; }}
            .stats {{ display: flex; gap: 16px; margin: 24px 0; }}
            .stat {{ flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }}
            .stat-value {{ font-size: 32px; font-weight: bold; color: #4f46e5; }}
            .stat-label {{ font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
            th {{ background: #f1f5f9; color: #334155; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: 600; }}
            td {{ padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }}
            tr:hover td {{ background: #f8fafc; }}
            .score {{ display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 6px; font-weight: bold; font-size: 12px; color: white; }}
            .score-high {{ background: #10b981; }}
            .score-mid {{ background: #f59e0b; }}
            .score-low {{ background: #94a3b8; }}
            .platform {{ background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }}
            .breakdown {{ display: flex; gap: 32px; margin-top: 16px; }}
            .breakdown-col {{ flex: 1; }}
            .breakdown-item {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }}
            .footer {{ margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }}
        </style>
    </head>
    <body>
        <h1>📊 Problem Discovery Report</h1>
        <p class="meta">Generated on {datetime.now().strftime('%B %d, %Y at %H:%M')} • Covering last {days} days</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">{total}</div>
                <div class="stat-label">Total Discovered</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(analyzed)}</div>
                <div class="stat-label">AI Analyzed</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(high_score)}</div>
                <div class="stat-label">High Potential (7+)</div>
            </div>
            <div class="stat">
                <div class="stat-value">{avg_score:.1f}</div>
                <div class="stat-label">Avg Score</div>
            </div>
        </div>
        
        <h2>📈 Platform Breakdown</h2>
        <div class="breakdown">
            {"".join(f'<div class="breakdown-item"><span>{k.title()}</span><strong>{v}</strong></div>' for k, v in sorted(platform_counts.items(), key=lambda x: -x[1])[:6])}
        </div>
        
        <h2>🔥 Top {len(top_problems)} Opportunities</h2>
        <table>
            <tr>
                <th style="width: 50px;">Score</th>
                <th style="width: 90px;">Platform</th>
                <th>Problem</th>
                <th style="width: 120px;">Category</th>
            </tr>
            {"".join(f'''
            <tr>
                <td><span class="score {"score-high" if p.insight.opportunity_score >= 7 else "score-mid" if p.insight.opportunity_score >= 5 else "score-low"}">{p.insight.opportunity_score}</span></td>
                <td><span class="platform">{escape(p.platform)}</span></td>
                <td>{escape(p.title[:70])}{"..." if len(p.title) > 70 else ""}</td>
                <td>{escape(p.insight.category or "-")}</td>
            </tr>
            ''' for p in top_problems)}
        </table>
        
        <div class="footer">
            <p>Report generated by Reddit Ops Console • Market Validation Toolkit</p>
            <p>To save as PDF: Use browser's Print function (Ctrl/Cmd + P) → "Save as PDF"</p>
        </div>
    </body>
    </html>
    """
    
    # Return as downloadable HTML file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        io.BytesIO(html.encode("utf-8")),
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=report_{timestamp}.html"}
    )


