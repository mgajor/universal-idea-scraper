"""
AI Enrichment Pipeline - OpenRouter Integration

Analyzes discovered problems and provides market insights:
- Categorization (domain/niche)
- Problem extraction (core job-to-be-done)
- Opportunity scoring
- Competitor detection
- Solution suggestions

Default model: perplexity/sonar (research-optimized with web search)
"""
import os
import json
import aiohttp
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class ProblemCategory(str, Enum):
    """Problem domain categories."""
    PRODUCTIVITY = "productivity"
    DEVELOPER_TOOLS = "developer_tools"
    MARKETING = "marketing"
    SALES = "sales"
    FINANCE = "finance"
    HEALTH = "health"
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"
    ECOMMERCE = "ecommerce"
    COMMUNICATION = "communication"
    DATA = "data"
    AUTOMATION = "automation"
    DESIGN = "design"
    OTHER = "other"


@dataclass
class ProblemInsight:
    """AI-generated insights for a discovered problem with comprehensive competitive intelligence."""
    
    # Core analysis
    category: ProblemCategory
    problem_summary: str  # 1-2 sentence description of the core problem
    job_to_be_done: str   # What the person is trying to accomplish (JTBD framework)
    
    # Market signals
    opportunity_score: int  # 1-10 rating
    score_reasoning: str = ""  # Why this score was given
    demand_signals: List[str] = field(default_factory=list)  # Evidence this is a real need
    
    # Competitive Intelligence
    competitors: List[dict] = field(default_factory=list)  # Detailed competitor analysis
    market_gaps: List[str] = field(default_factory=list)  # What no solution does well
    improvement_opportunities: List[dict] = field(default_factory=list)  # Specific areas to improve
    
    # Enhanced Market Analysis (NEW)
    market_sizing: Dict[str, Any] = field(default_factory=dict)  # TAM/SAM/SOM with methodology
    validation_metrics: Dict[str, Any] = field(default_factory=dict)  # Experiments and KPIs
    risk_assessment: Dict[str, Any] = field(default_factory=dict)  # Market, execution, competitive risks
    execution_roadmap: Dict[str, Any] = field(default_factory=dict)  # MVP/Launch/Scale phases
    comparable_exits: List[dict] = field(default_factory=list)  # Similar company exits/acquisitions
    
    # Legacy fields (for backward compatibility)
    existing_solutions: List[str] = field(default_factory=list)  # Simple list of solution names
    solution_gaps: List[str] = field(default_factory=list)  # What's missing
    market_size_estimate: str = ""  # Simple TAM/SAM estimate (legacy)
    
    # Actionable insights
    suggested_approaches: List[Any] = field(default_factory=list)  # Product/feature ideas (can be list of dicts now)
    target_audience: Any = ""  # Who has this problem (can be string or dict now)
    monetization_potential: Any = ""  # Pricing models and revenue potential (can be string or dict now)
    recommended_next_steps: List[str] = field(default_factory=list)  # Validation steps
    
    # Meta
    analyzed_at: datetime = field(default_factory=datetime.now)
    model_used: str = ""
    
    def to_dict(self) -> dict:
        return {
            "category": self.category.value,
            "problem_summary": self.problem_summary,
            "job_to_be_done": self.job_to_be_done,
            "opportunity_score": self.opportunity_score,
            "score_reasoning": self.score_reasoning,
            "demand_signals": self.demand_signals,
            "competitors": self.competitors,
            "market_gaps": self.market_gaps,
            "improvement_opportunities": self.improvement_opportunities,
            "market_sizing": self.market_sizing,
            "validation_metrics": self.validation_metrics,
            "risk_assessment": self.risk_assessment,
            "execution_roadmap": self.execution_roadmap,
            "comparable_exits": self.comparable_exits,
            "market_size_estimate": self.market_size_estimate,  # Legacy
            "existing_solutions": self.existing_solutions,
            "solution_gaps": self.solution_gaps,
            "suggested_approaches": self.suggested_approaches,
            "target_audience": self.target_audience,
            "monetization_potential": self.monetization_potential,
            "recommended_next_steps": self.recommended_next_steps,
            "analyzed_at": self.analyzed_at.isoformat(),
            "model_used": self.model_used,
        }


@dataclass
class SignalAnalysis:
    """AI-generated analysis of market signals from multi-source validation."""
    
    # Core analysis
    validation_summary: str  # 2-3 paragraph narrative summary
    confidence_score: int  # 0-100 based on signal quality and relevance
    confidence_explanation: str  # Why this confidence score was given
    
    # Signal-specific insights
    jobs_insights: List[str] = field(default_factory=list)  # What job signals reveal
    news_insights: List[str] = field(default_factory=list)  # What news signals reveal
    social_insights: List[str] = field(default_factory=list)  # What social signals reveal
    
    # Market validation
    market_validation_score: str = ""  # Strong/Moderate/Weak validation
    key_findings: List[str] = field(default_factory=list)  # Top 3-5 findings
    red_flags: List[str] = field(default_factory=list)  # Concerns or risks
    
    # Recommendations
    recommendations: List[str] = field(default_factory=list)  # Action items
    next_steps: List[str] = field(default_factory=list)  # Immediate actions
    
    # Meta
    analyzed_at: datetime = field(default_factory=datetime.now)
    model_used: str = ""
    signals_analyzed: int = 0
    
    def to_dict(self) -> dict:
        return {
            "validation_summary": self.validation_summary,
            "confidence_score": self.confidence_score,
            "confidence_explanation": self.confidence_explanation,
            "jobs_insights": self.jobs_insights,
            "news_insights": self.news_insights,
            "social_insights": self.social_insights,
            "market_validation_score": self.market_validation_score,
            "key_findings": self.key_findings,
            "red_flags": self.red_flags,
            "recommendations": self.recommendations,
            "next_steps": self.next_steps,
            "analyzed_at": self.analyzed_at.isoformat(),
            "model_used": self.model_used,
            "signals_analyzed": self.signals_analyzed,
        }


# System prompt for SIGNAL ANALYSIS (multi-source market validation)
SIGNAL_ANALYSIS_PROMPT = """You are an elite market validation analyst. Your task is to analyze market signals collected from multiple sources (job postings, news articles, social media) and synthesize them into actionable market validation insights.

Analyze the provided signals and determine:
1. How strongly these signals validate the market opportunity
2. What specific insights each signal type reveals
3. Any red flags or concerns
4. Recommended next steps based on the signal data

Always respond with valid JSON in this exact format:
{
    "validation_summary": "2-3 paragraphs synthesizing all signals into a cohesive market validation narrative. Discuss what the signals collectively reveal about market demand, timing, competition, and opportunity. Be specific and cite actual signal data where relevant.",
    
    "confidence_score": 0-100 (based on signal quantity, quality, relevance, and consistency),
    
    "confidence_explanation": "2-3 sentences explaining why this confidence score was assigned. Reference specific signals and their weight in the assessment.",
    
    "market_validation_score": "Strong/Moderate/Weak/Insufficient - overall validation assessment",
    
    "jobs_insights": [
        "Insight 1 from job postings (e.g., 'Companies actively hiring for X role suggests growing demand')",
        "Insight 2 about hiring trends, salary ranges, or skill requirements",
        "Insight 3 about company types and industries hiring"
    ],
    
    "news_insights": [
        "Insight 1 from news coverage (e.g., 'Recent funding in this space indicates investor confidence')",
        "Insight 2 about market trends or industry developments",
        "Insight 3 about regulatory or technology shifts"
    ],
    
    "social_insights": [
        "Insight 1 from social signals (e.g., 'High engagement on related content suggests audience interest')",
        "Insight 2 about user sentiment or pain points",
        "Insight 3 about viral potential or community interest"
    ],
    
    "key_findings": [
        "Top finding 1 - most important takeaway from all signals combined",
        "Finding 2 - second most important insight",
        "Finding 3 - additional significant finding",
        "Finding 4 - supporting evidence or pattern",
        "Finding 5 - market timing or window of opportunity"
    ],
    
    "red_flags": [
        "Concern 1 (if any) - e.g., 'Low signal volume may indicate niche market'",
        "Concern 2 - competitive pressure or market saturation indicators",
        "Concern 3 - timing or execution risks"
    ],
    
    "recommendations": [
        "Recommendation 1 - specific action based on signal analysis",
        "Recommendation 2 - market approach suggestion",
        "Recommendation 3 - validation step to take",
        "Recommendation 4 - risk mitigation"
    ],
    
    "next_steps": [
        "Immediate action 1 - what to do this week",
        "Action 2 - follow-up research needed",
        "Action 3 - people to talk to or validate with"
    ]
}

CRITICAL GUIDELINES:
- Base ALL insights on the actual signals provided - don't invent data
- If signal volume is low, acknowledge this and adjust confidence score accordingly
- Be specific - reference actual signal content, not generic observations
- Confidence score should be proportional to signal quality AND quantity:
  - 0-20: Insufficient signals (1-2 low-quality signals)
  - 21-40: Weak validation (few signals, mixed relevance)
  - 41-60: Moderate validation (decent signal volume with some relevance)
  - 61-80: Good validation (multiple relevant signals, consistent patterns)
  - 81-100: Strong validation (high volume, high relevance, clear market signal)
- If no signals of a type exist, acknowledge this in the corresponding insights array
- Think like a venture analyst evaluating market traction evidence"""


# System prompt for problem analysis
ANALYSIS_SYSTEM_PROMPT = """You are an elite market research analyst, competitive intelligence expert, and startup advisor. Your task is to analyze a post where someone is looking for a tool/solution and provide COMPREHENSIVE, ACTIONABLE market intelligence that could serve as a full market validation report.

RESEARCH DEEPLY using your knowledge to identify:
1. Real competitors and products in the market (names, URLs, actual pricing)
2. What existing solutions do well and poorly based on real user feedback
3. Specific improvement opportunities with difficulty/impact assessment
4. Validated market signals and demand evidence
5. Market sizing estimates with methodology
6. Execution roadmap for building a solution

Always respond with valid JSON in this exact format:
{
    "category": "one of: productivity, developer_tools, marketing, sales, finance, health, education, entertainment, ecommerce, communication, data, automation, design, other",
    
    "problem_summary": "A comprehensive 2-3 sentence description of the core problem. Be specific about the pain points, frequency, and who experiences this problem.",
    
    "job_to_be_done": "The underlying goal using Jobs-to-be-Done framework. Format: 'When [situation], I want to [motivation], so I can [expected outcome].'",
    
    "opportunity_score": 1-10 (10 = massive validated opportunity with clear gaps and urgency),
    
    "score_reasoning": "Detailed explanation of the score considering: market size, competition intensity, barrier to entry, willingness to pay, problem urgency, and timing factors. 2-3 sentences.",
    
    "demand_signals": [
        "Signal 1: Quantified evidence (e.g., 'r/productivity posts about this 15-20 times monthly with avg 50+ upvotes')",
        "Signal 2: Search volume indicator (e.g., 'Related keywords searched 10K+ times/month')",
        "Signal 3: Market trend (e.g., 'Remote work growth driving 40% increase in tool searches')",
        "Signal 4: Competitor traction (e.g., 'Leading solutions raised $X funding, suggesting VC validation')",
        "Signal 5: User willingness to pay (e.g., 'Users regularly mention paying $X-Y for alternatives')"
    ],
    
    "competitors": [
        {
            "name": "Actual Product/Company Name",
            "url": "https://exact-product-url.com",
            "description": "Detailed description of what the product does and its unique angle",
            "pricing": {
                "model": "Freemium/Subscription/Usage-based/One-time",
                "free_tier": "What's included free",
                "paid_tiers": "Entry at $X/mo, Pro at $Y/mo, Enterprise custom",
                "annual_discount": "X% off annually if applicable"
            },
            "strengths": ["Specific strength 1 with evidence", "Strength 2", "Strength 3"],
            "weaknesses": ["Specific weakness from user reviews", "Missing feature users complain about", "UX issue mentioned frequently"],
            "market_position": "Market Leader/Challenger/Specialist/Emerging",
            "estimated_users": "Approximate user base if known (e.g., '500K+ users', '$10M ARR')",
            "founded": "Year founded if known"
        }
    ],
    
    "market_sizing": {
        "tam": "Total Addressable Market - the entire market (e.g., '$50B global productivity software market')",
        "sam": "Serviceable Addressable Market - segment you can target (e.g., '$2B SMB productivity tools for remote teams')",
        "som": "Serviceable Obtainable Market - realistic year 1-3 capture (e.g., '$20M if capturing 1% of SMB segment')",
        "growth_rate": "Market CAGR percentage (e.g., '15% annually through 2028')",
        "methodology": "Brief explanation of how you estimated these numbers"
    },
    
    "market_gaps": [
        "Gap 1: Specific underserved need with explanation of why competitors don't address it",
        "Gap 2: Segment or use case with low competition",
        "Gap 3: Technical or UX opportunity others miss",
        "Gap 4: Pricing gap in the market",
        "Gap 5: Integration or ecosystem gap"
    ],
    
    "improvement_opportunities": [
        {
            "area": "Feature/UX/Pricing/Integration/Positioning",
            "title": "Short title for this opportunity",
            "description": "Detailed description of the improvement and why it matters",
            "difficulty": "Easy (1-2 weeks)/Medium (1-2 months)/Hard (3+ months)",
            "impact": "Low/Medium/High/Critical",
            "competitive_advantage": "How long before competitors can copy this"
        }
    ],
    
    "validation_metrics": {
        "key_hypothesis": "The core bet you're making about this opportunity",
        "validation_experiments": [
            {
                "experiment": "Specific test to run",
                "success_criteria": "What result confirms the hypothesis",
                "time_required": "How long this takes",
                "cost": "Budget needed"
            }
        ],
        "leading_indicators": ["Early metric 1 that predicts success", "Metric 2", "Metric 3"],
        "lagging_indicators": ["Revenue milestone", "Retention rate target", "NPS goal"]
    },
    
    "risk_assessment": {
        "market_risks": ["Risk 1 with mitigation", "Risk 2"],
        "execution_risks": ["Technical risk", "Team risk"],
        "competitive_risks": ["Incumbent response risk", "New entrant risk"],
        "overall_risk_level": "Low/Medium/High"
    },
    
    "suggested_approaches": [
        {
            "approach": "Approach name/title",
            "description": "Detailed description of product strategy",
            "positioning": "How to position against competitors",
            "differentiation": "Key differentiator",
            "initial_feature_set": ["Core feature 1", "Feature 2", "Feature 3"],
            "go_to_market": "Initial GTM strategy"
        }
    ],
    
    "target_audience": {
        "primary_segment": "Most important customer segment with specifics",
        "job_titles": ["Title 1", "Title 2", "Title 3"],
        "company_size": "Startup/SMB/Mid-market/Enterprise or specific employee counts",
        "industries": ["Industry 1", "Industry 2"],
        "psychographics": "Attitudes, behaviors, values",
        "pain_intensity": "How painful is this problem (1-10) and why",
        "current_alternatives": "What they're using today as workarounds"
    },
    
    "monetization_potential": {
        "pricing_strategy": "Recommended pricing model",
        "price_point_range": "$X - $Y per user/month or equivalent",
        "revenue_per_customer": "Expected ARPU/ACV",
        "ltv_estimate": "Estimated LTV based on retention assumptions",
        "path_to_1m_arr": "How many customers at what price to reach $1M ARR",
        "upsell_opportunities": ["Upsell 1", "Upsell 2"]
    },
    
    "execution_roadmap": {
        "phase_1_mvp": {
            "duration": "X weeks",
            "goal": "What MVP proves",
            "features": ["Feature 1", "Feature 2"],
            "success_metric": "Target for validation",
            "budget_estimate": "Rough cost"
        },
        "phase_2_launch": {
            "duration": "X months",
            "goal": "First revenue/customers",
            "features": ["Additional feature 1", "Feature 2"],
            "success_metric": "Revenue/customer target"
        },
        "phase_3_scale": {
            "duration": "X months",
            "goal": "Growth milestones",
            "key_investments": ["Marketing", "Sales", "Product"]
        }
    },
    
    "comparable_exits": [
        {
            "company": "Company that was acquired/IPO'd in this space",
            "exit_type": "Acquisition/IPO",
            "valuation": "Exit valuation if known",
            "acquirer": "Who bought them",
            "year": "When it happened",
            "relevance": "Why this is a good comparable"
        }
    ],
    
    "recommended_next_steps": [
        "Step 1: Specific immediate action (today/this week)",
        "Step 2: Research task with specific goal",
        "Step 3: Validation experiment to run",
        "Step 4: MVP feature to prototype first",
        "Step 5: First customers to reach out to"
    ]
}

CRITICAL GUIDELINES:
- Be EXTREMELY SPECIFIC with competitor names, URLs, and real pricing - research extensively
- Base all insights on real market data and observable patterns
- Provide ACTIONABLE, SPECIFIC insights - not generic advice
- Include actual numbers and estimates where possible
- If you don't know something specific, provide your best estimate with [estimate] tag
- Think like a startup advisor who has to stake their reputation on this analysis
- The goal is to give someone enough information to decide whether to pursue this opportunity"""


class AIEnrichmentService:
    """
    AI-powered problem analysis via OpenRouter.
    
    Default model: perplexity/sonar (research-optimized with web search)
    """
    
    # API endpoint
    API_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    # Default to Perplexity Sonar via OpenRouter (great for research)
    DEFAULT_MODEL = "perplexity/sonar"
    
    # Fallback models
    FALLBACK_MODELS = [
        "anthropic/claude-3-haiku",  # Fast and cheap
        "openai/gpt-3.5-turbo",      # Widely available
    ]
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")
    
    @property
    def is_configured(self) -> bool:
        """Check if OpenRouter API key is configured."""
        return bool(self.api_key)
    
    async def analyze_problem(
        self,
        title: str,
        snippet: str,
        url: str,
        platform: str,
        model: Optional[str] = None,
    ) -> Optional[ProblemInsight]:
        """
        Analyze a discovered problem and generate insights.
        
        Args:
            title: Post title
            snippet: Post snippet/description
            url: Source URL
            platform: Where it was found
            model: Model to use (defaults to perplexity/sonar)
        
        Returns:
            ProblemInsight with AI analysis
        """
        if not self.is_configured:
            raise ValueError("OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env")
        
        model = model or self.DEFAULT_MODEL
        
        # Build the user prompt
        user_prompt = f"""Analyze this post where someone is looking for a solution:

**Platform:** {platform}
**Title:** {title}
**Content:** {snippet}
**URL:** {url}

Provide market research insights in the JSON format specified."""

        try:
            response = await self._call_api(
                model=model,
                system_prompt=ANALYSIS_SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )
            
            # Parse JSON response
            insight = self._parse_response(response, model)
            return insight
            
        except Exception as e:
            print(f"[AI] Analysis failed: {e}")
            return None
    
    async def _call_api(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        """Call OpenRouter API."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://problem-discovery.local",
            "X-Title": "Problem Discovery Platform",
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,  # Lower for more consistent JSON
            "max_tokens": 8000,  # Increased for comprehensive market analysis
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.API_URL,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=120),  # Increased timeout for detailed analysis
            ) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"OpenRouter API error: {response.status} - {text[:200]}")
                
                data = await response.json()
                content = data["choices"][0]["message"]["content"]
                return content
    
    def _parse_response(self, response: str, model: str) -> ProblemInsight:
        """Parse AI response into ProblemInsight with comprehensive market intelligence."""
        
        # Clean up response (sometimes models add markdown)
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        
        data = json.loads(response.strip())
        
        # Map category string to enum
        category_str = data.get("category", "other").lower()
        try:
            category = ProblemCategory(category_str)
        except ValueError:
            category = ProblemCategory.OTHER
        
        # Extract competitor names for legacy field
        competitors = data.get("competitors", [])
        existing_solutions = data.get("existing_solutions", [])
        if not existing_solutions and competitors:
            # Fallback: extract names from competitors for backward compatibility
            existing_solutions = [c.get("name", "") for c in competitors if isinstance(c, dict) and c.get("name")]
        
        # Handle market_size_estimate - new format is dict, old format is string
        market_sizing = data.get("market_sizing", {})
        if isinstance(market_sizing, dict):
            # Extract simple estimate for legacy field
            market_size_estimate = market_sizing.get("tam", "") or market_sizing.get("sam", "")
        else:
            market_size_estimate = data.get("market_size_estimate", "")
        
        return ProblemInsight(
            category=category,
            problem_summary=data.get("problem_summary", ""),
            job_to_be_done=data.get("job_to_be_done", ""),
            opportunity_score=min(10, max(1, data.get("opportunity_score", 5))),
            score_reasoning=data.get("score_reasoning", ""),
            demand_signals=data.get("demand_signals", []),
            competitors=competitors,
            market_gaps=data.get("market_gaps", []),
            improvement_opportunities=data.get("improvement_opportunities", []),
            # New enhanced fields
            market_sizing=data.get("market_sizing", {}),
            validation_metrics=data.get("validation_metrics", {}),
            risk_assessment=data.get("risk_assessment", {}),
            execution_roadmap=data.get("execution_roadmap", {}),
            comparable_exits=data.get("comparable_exits", []),
            # Legacy fields
            market_size_estimate=market_size_estimate,
            existing_solutions=existing_solutions,
            solution_gaps=data.get("solution_gaps", data.get("market_gaps", [])),
            suggested_approaches=data.get("suggested_approaches", []),
            target_audience=data.get("target_audience", ""),
            monetization_potential=data.get("monetization_potential", ""),
            recommended_next_steps=data.get("recommended_next_steps", []),
            model_used=model,
        )
    
    async def analyze_market_signals(
        self,
        problem_title: str,
        problem_summary: str,
        signals: List[Dict[str, Any]],
        model: Optional[str] = None,
    ) -> Optional['SignalAnalysis']:
        """
        Analyze market signals using Perplexity AI.
        
        Args:
            problem_title: The problem being validated
            problem_summary: Brief description of the problem
            signals: List of market signals with source_type, title, description, etc.
            model: Model to use (defaults to perplexity/sonar)
        
        Returns:
            SignalAnalysis with validation summary, confidence, and insights
        """
        if not self.is_configured:
            print("[AI] OpenRouter API key not configured - skipping signal analysis")
            return None
        
        if not signals:
            print("[AI] No signals to analyze")
            return None
        
        model = model or self.DEFAULT_MODEL
        
        # Group signals by type
        jobs_signals = [s for s in signals if s.get("source_type") == "jobs"]
        news_signals = [s for s in signals if s.get("source_type") == "news"]
        social_signals = [s for s in signals if s.get("source_type") == "social"]
        other_signals = [s for s in signals if s.get("source_type") not in ("jobs", "news", "social")]
        
        # Build the user prompt with signal data
        user_prompt = f"""Analyze the following market signals for this opportunity:

**OPPORTUNITY:**
Title: {problem_title}
Summary: {problem_summary}

**COLLECTED SIGNALS ({len(signals)} total):**

"""
        if jobs_signals:
            user_prompt += f"## JOB SIGNALS ({len(jobs_signals)} signals)\n"
            for i, s in enumerate(jobs_signals[:5], 1):  # Limit to 5 per type
                user_prompt += f"{i}. **{s.get('title', 'Untitled')}**\n"
                user_prompt += f"   Source: {s.get('source_name', 'Unknown')}\n"
                if s.get('description'):
                    user_prompt += f"   Details: {s.get('description')[:200]}\n"
                user_prompt += f"   Volume: {s.get('volume', 0)}\n\n"
        else:
            user_prompt += "## JOB SIGNALS\nNo job signals collected.\n\n"
        
        if news_signals:
            user_prompt += f"## NEWS SIGNALS ({len(news_signals)} signals)\n"
            for i, s in enumerate(news_signals[:5], 1):
                user_prompt += f"{i}. **{s.get('title', 'Untitled')}**\n"
                user_prompt += f"   Source: {s.get('source_name', 'Unknown')}\n"
                if s.get('description'):
                    user_prompt += f"   Details: {s.get('description')[:200]}\n\n"
        else:
            user_prompt += "## NEWS SIGNALS\nNo news signals collected.\n\n"
        
        if social_signals:
            user_prompt += f"## SOCIAL SIGNALS ({len(social_signals)} signals)\n"
            for i, s in enumerate(social_signals[:5], 1):
                user_prompt += f"{i}. **{s.get('title', 'Untitled')}**\n"
                user_prompt += f"   Source: {s.get('source_name', 'Unknown')}\n"
                if s.get('description'):
                    user_prompt += f"   Details: {s.get('description')[:200]}\n"
                user_prompt += f"   Engagement: {s.get('velocity', 0)}\n\n"
        else:
            user_prompt += "## SOCIAL SIGNALS\nNo social signals collected.\n\n"
        
        if other_signals:
            user_prompt += f"## OTHER SIGNALS ({len(other_signals)} signals)\n"
            for i, s in enumerate(other_signals[:3], 1):
                user_prompt += f"{i}. {s.get('title', 'Untitled')} ({s.get('source_type', 'unknown')})\n"
        
        user_prompt += "\nProvide your market validation analysis in the JSON format specified."
        
        try:
            response = await self._call_api(
                model=model,
                system_prompt=SIGNAL_ANALYSIS_PROMPT,
                user_prompt=user_prompt,
            )
            
            analysis = self._parse_signal_response(response, model, len(signals))
            return analysis
            
        except Exception as e:
            print(f"[AI] Signal analysis failed: {e}")
            return None
    
    def _parse_signal_response(self, response: str, model: str, signal_count: int) -> 'SignalAnalysis':
        """Parse AI signal analysis response into SignalAnalysis."""
        
        # Clean up response (sometimes models add markdown)
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        
        data = json.loads(response.strip())
        
        return SignalAnalysis(
            validation_summary=data.get("validation_summary", ""),
            confidence_score=min(100, max(0, data.get("confidence_score", 0))),
            confidence_explanation=data.get("confidence_explanation", ""),
            jobs_insights=data.get("jobs_insights", []),
            news_insights=data.get("news_insights", []),
            social_insights=data.get("social_insights", []),
            market_validation_score=data.get("market_validation_score", "Unknown"),
            key_findings=data.get("key_findings", []),
            red_flags=data.get("red_flags", []),
            recommendations=data.get("recommendations", []),
            next_steps=data.get("next_steps", []),
            model_used=model,
            signals_analyzed=signal_count,
        )
    
    async def batch_analyze(
        self,
        problems: List[Dict[str, str]],
        model: Optional[str] = None,
        concurrency: int = 3,
    ) -> List[Optional[ProblemInsight]]:
        """
        Analyze multiple problems with concurrency control.
        
        Args:
            problems: List of dicts with title, snippet, url, platform
            model: Model to use
            concurrency: Max concurrent API calls
        
        Returns:
            List of ProblemInsight (None for failed analyses)
        """
        import asyncio
        
        semaphore = asyncio.Semaphore(concurrency)
        
        async def analyze_with_semaphore(problem: Dict) -> Optional[ProblemInsight]:
            async with semaphore:
                return await self.analyze_problem(
                    title=problem.get("title", ""),
                    snippet=problem.get("snippet", ""),
                    url=problem.get("url", ""),
                    platform=problem.get("platform", "unknown"),
                    model=model,
                )
        
        tasks = [analyze_with_semaphore(p) for p in problems]
        return await asyncio.gather(*tasks)


# Global service instance
ai_enrichment = AIEnrichmentService()
