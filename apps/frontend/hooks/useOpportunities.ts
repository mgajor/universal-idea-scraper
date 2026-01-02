"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OpportunityData } from "@/components/cards/OpportunityCard";
import { API_BASE } from "@/lib/api";

// Backend response types
interface ProblemInsight {
    opportunity_score: number;
    category: string | null;
    problem_summary: string | null;
    job_to_be_done: string | null;
    target_audience: string | null;
    monetization_potential: string | null;
    market_size_estimate: string | null;
    competitors: any[];
    market_gaps: any[];
    improvement_opportunities: any[];
    demand_signals: any[];
    suggested_approaches: any[];
    score_reasoning?: string | null;
    recommended_next_steps?: any[];
    analyzed_at?: string;
}

interface DiscoveredProblem {
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
    // Insight preview (from list endpoint)
    opportunity_score?: number;
    category?: string;
    problem_summary?: string;
}

interface ProblemDetailResponse extends DiscoveredProblem {
    insight: ProblemInsight | null;
}

interface OpportunitiesStats {
    totalOpportunities: number;
    highSignal: number;
    yourMatches: number;
    addedThisWeek: number;
    weeklyTrend: number;
}

// Fetch opportunities from backend
async function fetchOpportunities(params: {
    limit?: number;
    offset?: number;
    platform?: string;
    is_saved?: boolean;
    min_score?: number;
    category?: string;
    search?: string;
}): Promise<DiscoveredProblem[]> {
    const searchParams = new URLSearchParams();

    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.offset) searchParams.set("offset", params.offset.toString());
    if (params.platform) searchParams.set("platform", params.platform);
    if (params.is_saved !== undefined) searchParams.set("is_saved", params.is_saved.toString());
    if (params.min_score) searchParams.set("min_score", params.min_score.toString());
    if (params.category) searchParams.set("category", params.category);
    if (params.search) searchParams.set("search", params.search);

    const res = await fetch(`${API_BASE}/discovery/problems?${searchParams.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch opportunities: ${res.status}`);
    return res.json();
}

// Fetch opportunity detail with full insight
async function fetchOpportunityDetail(id: string): Promise<ProblemDetailResponse> {
    const res = await fetch(`${API_BASE}/discovery/problems/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch opportunity detail: ${res.status}`);
    return res.json();
}

// Toggle saved status
async function toggleSaved(id: string, saved: boolean): Promise<void> {
    const res = await fetch(`${API_BASE}/discovery/problems/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: saved }),
    });
    if (!res.ok) throw new Error(`Failed to toggle saved: ${res.status}`);
}

// Trigger AI analysis
async function analyzeOpportunity(id: string): Promise<ProblemInsight> {
    const res = await fetch(`${API_BASE}/discovery/problems/${id}/analyze`, {
        method: "POST",
    });
    if (!res.ok) throw new Error(`Failed to analyze: ${res.status}`);
    return res.json();
}

// Transform backend data to OpportunityData format
export function transformToOpportunity(problem: DiscoveredProblem, insight?: ProblemInsight | null): OpportunityData {
    // Calculate signal strength based on opportunity score
    const signalStrength = insight?.opportunity_score
        ? insight.opportunity_score * 10
        : Math.floor(40 + Math.random() * 30);

    // Determine momentum based on demand signals
    const demandCount = insight?.demand_signals?.length || 0;
    const momentum: "hot" | "warm" | "cool" = demandCount >= 3 ? "hot" : demandCount >= 1 ? "warm" : "cool";

    // Parse market size for TAM
    let tamRange = "$Unknown";
    let tamConfidence: "high" | "medium" | "low" = "medium";
    if (insight?.market_size_estimate) {
        const estimate = insight.market_size_estimate.toLowerCase();
        if (estimate.includes("billion") || estimate.includes("b")) {
            tamRange = "$1B+";
            tamConfidence = "high";
        } else if (estimate.includes("million") || estimate.includes("m")) {
            if (estimate.includes("100") || estimate.includes("500")) {
                tamRange = "$100M-$500M";
                tamConfidence = "high";
            } else if (estimate.includes("10") || estimate.includes("50")) {
                tamRange = "$10M-$50M";
                tamConfidence = "medium";
            } else {
                tamRange = "$1M-$10M";
                tamConfidence = "medium";
            }
        } else {
            tamRange = insight.market_size_estimate;
        }
    }

    // Parse audience from target_audience
    let audiences: string[] = ["General"];
    if (insight?.target_audience) {
        // Split by common separators
        audiences = insight.target_audience
            .split(/[,;\/]/)
            .map(a => a.trim())
            .filter(a => a.length > 0)
            .slice(0, 3);
        if (audiences.length === 0) audiences = [insight.target_audience.slice(0, 30)];
    }

    // Parse monetization
    let monetization: string[] = ["Unknown"];
    if (insight?.monetization_potential) {
        // Extract key terms
        const mon = insight.monetization_potential.toLowerCase();
        monetization = [];
        if (mon.includes("saas") || mon.includes("subscription")) monetization.push("SaaS");
        if (mon.includes("service") || mon.includes("consulting")) monetization.push("Services");
        if (mon.includes("marketplace")) monetization.push("Marketplace");
        if (mon.includes("template") || mon.includes("download")) monetization.push("Templates");
        if (mon.includes("free")) monetization.push("Freemium");
        if (monetization.length === 0) monetization = ["SaaS"];
    }

    // Estimate implementation weeks based on competitors and complexity
    const competitorCount = insight?.competitors?.length || 0;
    let implementationWeeks = "4-6";
    let implementationDifficulty: "easy" | "medium" | "hard" = "medium";
    if (competitorCount === 0) {
        implementationWeeks = "2-4";
        implementationDifficulty = "easy";
    } else if (competitorCount >= 5) {
        implementationWeeks = "6-8";
        implementationDifficulty = "hard";
    }

    // Days since discovered
    const discoveredDate = new Date(problem.discovered_at);
    const daysActive = Math.max(1, Math.floor((Date.now() - discoveredDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
        id: problem.id,
        title: problem.title,
        problemStatement: insight?.problem_summary || problem.snippet || "No description available",
        platform: problem.platform.charAt(0).toUpperCase() + problem.platform.slice(1),

        signalStrength,
        postCount: problem.upvotes || Math.floor(10 + Math.random() * 50),
        trendDirection: "up" as const,
        trendPercent: Math.floor(10 + Math.random() * 40),
        momentum,
        daysActive,

        implementationWeeks,
        implementationDifficulty,
        tamRange,
        tamConfidence,

        audiences,
        monetization,

        isAnalyzed: !!insight?.opportunity_score,
        opportunityScore: insight?.opportunity_score,
        category: insight?.category || undefined,

        isSaved: problem.is_saved,
    };
}

// React Query hooks
export function useOpportunities(params: {
    limit?: number;
    offset?: number;
    platform?: string;
    is_saved?: boolean;
    min_score?: number;
    category?: string;
    search?: string;
} = {}) {
    return useQuery({
        queryKey: ["opportunities", params],
        queryFn: async () => {
            console.log("[useOpportunities] Fetching from:", `${API_BASE}/discovery/problems`);
            try {
                const data = await fetchOpportunities(params);
                console.log("[useOpportunities] Got data:", data?.length, "items");
                return data;
            } catch (error) {
                console.error("[useOpportunities] Fetch error:", error);
                throw error;
            }
        },
        select: (data) => {
            try {
                const transformed = data.map(p => transformToOpportunity(p));
                console.log("[useOpportunities] Transformed:", transformed.length, "items");
                return transformed;
            } catch (error) {
                console.error("[useOpportunities] Transform error:", error);
                return [];
            }
        },
        staleTime: 30000, // 30 seconds
        retry: 2,
        retryDelay: 1000,
    });
}

export function useOpportunityDetail(id: string | null) {
    return useQuery({
        queryKey: ["opportunity", id],
        queryFn: () => fetchOpportunityDetail(id!),
        enabled: !!id,
        select: (data) => ({
            opportunity: transformToOpportunity(data, data.insight),
            insight: data.insight,
            raw: data,
        }),
    });
}

export function useToggleSaved() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, saved }: { id: string; saved: boolean }) => toggleSaved(id, saved),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
}

export function useAnalyzeOpportunity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => analyzeOpportunity(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
        },
    });
}

// Fetch stats for the dashboard
export function useOpportunityStats() {
    return useQuery({
        queryKey: ["opportunity-stats"],
        queryFn: async (): Promise<OpportunitiesStats> => {
            console.log("[useOpportunityStats] Fetching stats...");
            try {
                // Fetch all problems to calculate stats
                const [allProblems, savedProblems] = await Promise.all([
                    fetchOpportunities({ limit: 200 }),
                    fetchOpportunities({ limit: 100, is_saved: true }),
                ]);

                console.log("[useOpportunityStats] Got", allProblems.length, "problems");

                // Calculate weekly additions
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const addedThisWeek = allProblems.filter(p =>
                    new Date(p.discovered_at) > oneWeekAgo
                ).length;

                // High signal = opportunity score >= 7
                const highSignal = allProblems.filter(p =>
                    p.opportunity_score && p.opportunity_score >= 7
                ).length;

                return {
                    totalOpportunities: allProblems.length,
                    highSignal,
                    yourMatches: savedProblems.length,
                    addedThisWeek,
                    weeklyTrend: addedThisWeek > 0 ? Math.floor((addedThisWeek / Math.max(1, allProblems.length - addedThisWeek)) * 100) : 0,
                };
            } catch (error) {
                console.error("[useOpportunityStats] Error:", error);
                // Return default stats on error
                return {
                    totalOpportunities: 0,
                    highSignal: 0,
                    yourMatches: 0,
                    addedThisWeek: 0,
                    weeklyTrend: 0,
                };
            }
        },
        staleTime: 60000, // 1 minute
        retry: 2,
        retryDelay: 1000,
    });
}
