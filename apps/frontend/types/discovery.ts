/**
 * Discovery & Opportunities Types
 * Types for problem discovery, analysis, and opportunity tracking.
 */

// Backend response for a discovered problem
export interface DiscoveredProblem {
    id: string;
    url: string;
    title: string;
    snippet: string | null;
    platform: string;
    keyword_matched: string | null;
    is_saved: boolean;
    is_hidden: boolean;
    notes: string | null;
    discovered_at: string;
    upvotes?: number;
    comments_count?: number;
    opportunity_score?: number;
    category?: string;
    problem_summary?: string;
}

// AI analysis insight for a problem
export interface ProblemInsight {
    opportunity_score: number;
    category: string | null;
    problem_summary: string | null;
    job_to_be_done: string | null;
    target_audience: string | null;
    monetization: string[];
    audiences: string[];
    competitors: any[];
    market_gaps: any[];
    improvement_opportunities: any[];
    demand_signals: any[];
    suggested_approaches: any[];
    score_reasoning?: string | null;
    recommended_next_steps?: any[];
    analyzed_at?: string;
}

// Full problem detail with insight
export interface ProblemDetailResponse {
    opportunity: DiscoveredProblem;
    insight: ProblemInsight | null;
    raw: {
        url: string;
        title: string;
        content: string;
    };
}

// Stats for opportunities dashboard
export interface OpportunitiesStats {
    totalOpportunities: number;
    highSignal: number;
    yourMatches: number;
    addedThisWeek: number;
    weeklyTrend: number;
}

// Search job types
export interface SearchJob {
    id: string;
    name: string;
    keywords: string[];
    platforms: string[];
    max_results: number;
    time_filter: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    error_message: string | null;
    total_results: number;
    results_analyzed: number;
    created_at: string;
}

export interface CreateSearchJobRequest {
    name: string;
    keywords: string[];
    platforms: string[];
    max_results?: number;
    time_filter?: string;
}

// Platform configuration
export interface Platform {
    id: string;
    name: string;
    icon: string;
    description: string;
    enabled: boolean;
}

// Filter types
export type AudiencePersona = "all" | "saas" | "service" | "agency" | "hybrid";
export type TimeFrame = "24h" | "7d" | "30d" | "all";
export type ViewMode = "grid" | "list";
