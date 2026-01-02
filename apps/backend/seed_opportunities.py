#!/usr/bin/env python3
"""
Seed the discovery database with sample opportunities for testing the UI.
Run from the backend directory with: python seed_opportunities.py
"""
import asyncio
import uuid
from datetime import datetime, timedelta
import random

# Must run from apps/backend directory
import sys
sys.path.insert(0, '.')

from backend_db import get_session, init_db
from backend_db.discovery_models import DiscoveredProblem, ProblemInsight

SAMPLE_OPPORTUNITIES = [
    {
        "title": "Need automated lead qualification for my agency",
        "snippet": "We're drowning in leads but 80% are tire-kickers. Manual qualification takes 3+ hours daily. Looking for an AI tool that can score and qualify leads automatically based on our ICP criteria.",
        "platform": "reddit",
        "category": "Sales",
        "target_audience": "Marketing agencies, SaaS founders, B2B sales teams",
        "monetization": "SaaS subscription $99-299/mo, Enterprise tier $500+/mo",
        "tam": "$2B+ CRM/Sales automation market",
        "competitors": ["Clearbit", "ZoomInfo", "Apollo.io"],
        "score": 8,
    },
    {
        "title": "Client onboarding is chaotic - need automation",
        "snippet": "Every new client requires 20+ manual steps. We drop the ball on deliverables, forget to send contracts, miss kickoff calls. There has to be a better way to streamline client onboarding.",
        "platform": "indiehackers",
        "category": "Operations",
        "target_audience": "Consultants, Agencies, Freelancers, Service businesses",
        "monetization": "SaaS $49-199/mo, White-label for agencies $299+/mo",
        "tam": "$500M client management software market",
        "competitors": ["HoneyBook", "Dubsado", "17hats"],
        "score": 9,
    },
    {
        "title": "Invoice processing eating all my time",
        "snippet": "I'm a solo consultant with 15 clients. Creating, sending, tracking, and following up on invoices takes hours every week. Would pay good money for AI to automate this.",
        "platform": "hackernews",
        "category": "Finance",
        "target_audience": "Freelancers, Solo consultants, Small agencies",
        "monetization": "SaaS $29-99/mo, Usage-based for high volume",
        "tam": "$10B+ invoicing/accounting software market",
        "competitors": ["FreshBooks", "Wave", "Bonsai"],
        "score": 7,
    },
    {
        "title": "Content repurposing across 5 platforms is killing me",
        "snippet": "I write one long-form blog post per week but manually reformatting for Twitter threads, LinkedIn, newsletter, and YouTube scripts takes forever. AI should be able to help here.",
        "platform": "twitter",
        "category": "Marketing",
        "target_audience": "Content creators, Solopreneurs, Marketing teams",
        "monetization": "SaaS $19-79/mo, API access $99+/mo",
        "tam": "$1B content automation market",
        "competitors": ["Jasper", "Copy.ai", "Lately.ai"],
        "score": 8,
    },
    {
        "title": "Customer feedback scattered across 10 tools",
        "snippet": "Support tickets in Zendesk, reviews on G2, feature requests in Canny, app store reviews, social mentions... I can't get a unified view of what customers are actually saying.",
        "platform": "producthunt",
        "category": "Analytics",
        "target_audience": "Product managers, SaaS founders, Customer success teams",
        "monetization": "SaaS $99-499/mo, Enterprise custom pricing",
        "tam": "$3B voice of customer analytics market",
        "competitors": ["Productboard", "Canny", "UserVoice"],
        "score": 9,
    },
    {
        "title": "Cold outreach getting 0% replies",
        "snippet": "Sending 100+ cold emails per day but my response rate is basically 0%. The problem is all my emails sound generic. Need personalization at scale but can't do it manually.",
        "platform": "reddit",
        "category": "Sales",
        "target_audience": "SDRs, Founders, Agency owners, Freelancers",
        "monetization": "SaaS $79-299/mo, Credits system for heavy users",
        "tam": "$5B+ sales engagement market",
        "competitors": ["Lemlist", "Instantly", "SmartWriter"],
        "score": 8,
    },
    {
        "title": "Proposal creation takes 4 hours each",
        "snippet": "As an agency owner, I spend 4+ hours on each proposal. Template + research + pricing + case studies. We lose deals because competitors respond faster. Need proposal automation.",
        "platform": "indiehackers",
        "category": "Sales",
        "target_audience": "Agencies, Consultants, Service businesses",
        "monetization": "SaaS $99-399/mo, White-label $499+/mo",
        "tam": "$1B proposal management market",
        "competitors": ["PandaDoc", "Proposify", "Better Proposals"],
        "score": 7,
    },
    {
        "title": "Remote team productivity is a black box",
        "snippet": "Managing a remote team of 12 and I have zero visibility into productivity without micromanaging. Need insights on who's blocked, what's getting done, without being creepy.",
        "platform": "hackernews",
        "category": "Productivity",
        "target_audience": "Remote team managers, Startup CTOs, Agency owners",
        "monetization": "SaaS $12/user/mo, Team pricing $99-499/mo",
        "tam": "$2B remote work tools market",
        "competitors": ["Time Doctor", "Hubstaff", "Toggl"],
        "score": 6,
    },
    {
        "title": "Clients want custom dashboards but we can't build them",
        "snippet": "Every client wants their own analytics dashboard but building custom dashboards per client doesn't scale. Need white-label dashboard solution with easy customization.",
        "platform": "reddit",
        "category": "Analytics",
        "target_audience": "Marketing agencies, SaaS companies, Consultants",
        "monetization": "White-label SaaS $199-999/mo based on clients",
        "tam": "$1B+ embedded analytics market",
        "competitors": ["Databox", "AgencyAnalytics", "Geckoboard"],
        "score": 8,
    },
    {
        "title": "Meeting notes and action items getting lost",
        "snippet": "We have 20+ meetings per week. Notes are scattered, action items forgotten, decisions not documented. Need AI that joins meetings, takes notes, and tracks follow-ups.",
        "platform": "producthunt",
        "category": "Productivity",
        "target_audience": "Remote teams, Managers, Consultants",
        "monetization": "SaaS $15-30/user/mo, Team plans $99-299/mo",
        "tam": "$3B meeting software market",
        "competitors": ["Otter.ai", "Fireflies.ai", "Grain"],
        "score": 9,
    },
    {
        "title": "Need social proof but testimonial gathering doesn't scale",
        "snippet": "I know happy customers exist but getting them to write testimonials is like pulling teeth. And our website has zero social proof. Need automated testimonial collection.",
        "platform": "indiehackers",
        "category": "Marketing",
        "target_audience": "SaaS founders, E-commerce, Service businesses",
        "monetization": "SaaS $29-99/mo, Widget + video $199/mo",
        "tam": "$500M social proof/review market",
        "competitors": ["Testimonial.to", "VideoAsk", "Boast.io"],
        "score": 7,
    },
    {
        "title": "Email sequences failing but don't know why",
        "snippet": "Running email sequences for lead nurturing but open rates tanking, conversions dead. No idea which emails are the problem. Need better analytics and AI optimization.",
        "platform": "hackernews",
        "category": "Marketing",
        "target_audience": "SaaS marketers, Growth teams, Solo founders",
        "monetization": "SaaS $49-199/mo, Usage-based for high volume",
        "tam": "$2B email marketing market",
        "competitors": ["ConvertKit", "ActiveCampaign", "Mailchimp"],
        "score": 6,
    },
]


async def seed_opportunities():
    """Add sample opportunities to the database."""
    await init_db()
    
    async for session in get_session():
        count = 0
        for i, opp in enumerate(SAMPLE_OPPORTUNITIES):
            # Create problem
            problem = DiscoveredProblem(
                id=str(uuid.uuid4()),
                url=f"https://example.com/post/{uuid.uuid4().hex[:8]}",
                title=opp["title"],
                snippet=opp["snippet"],
                platform=opp["platform"],
                keyword_matched="looking for",
                is_saved=random.random() > 0.7,
                is_hidden=False,
                discovered_at=datetime.now() - timedelta(days=random.randint(1, 14)),
                upvotes=random.randint(10, 150),
                comments_count=random.randint(5, 50),
            )
            session.add(problem)
            
            # Create insight
            insight = ProblemInsight(
                id=str(uuid.uuid4()),
                problem_id=problem.id,
                category=opp["category"],
                problem_summary=opp["snippet"][:200],
                opportunity_score=opp["score"],
                score_reasoning=f"High demand signals with {opp['score']}/10 opportunity score based on engagement and market size.",
                target_audience=opp["target_audience"],
                monetization_potential=opp["monetization"],
                market_size_estimate=opp["tam"],
                demand_signals=[
                    "High upvote count",
                    "Multiple replies seeking solutions",
                    "Willingness to pay expressed",
                ],
                competitors=[{"name": c, "weakness": "Complex setup"} for c in opp["competitors"]],
                market_gaps=["No AI-first solution", "All options are overpriced for SMBs"],
                improvement_opportunities=["Simpler UX", "AI-powered automation", "Better pricing"],
                suggested_approaches=["MVP with core feature", "Target underserved niche"],
                analyzed_at=datetime.now(),
            )
            session.add(insight)
            count += 1
        
        await session.commit()
        print(f"✅ Added {count} sample opportunities to database")


if __name__ == "__main__":
    asyncio.run(seed_opportunities())
