"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Lightbulb,
    Search,
    Play,
    Bookmark,
    ExternalLink,
    Sparkles,
    Filter,
    ChevronDown,
    ChevronUp,
    X,
    Clock,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Loader2,
    RefreshCw,
    Users,
    Target,
    DollarSign,
    Zap,
    ArrowRight,
    Building2,
    ThumbsUp,
    ThumbsDown,
    AlertTriangle,
    Lightbulb as LightbulbIcon,
    BarChart3,
    List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AddToCollectionDropdown } from "@/components/collections/CollectionsPanel";
import { TrendsWidget } from "@/components/trends/TrendsWidget";
import { BulkAnalyzeButton } from "@/components/analysis/BulkAnalyzeButton";
import { ExportButton } from "@/components/exports/ExportButton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    usePlatforms,
    useKeywords,
    useProblems,
    useSearchJobs,
    useCreateSearchJob,
    useRunSearchJob,
    useToggleProblemSave,
    useAnalyzeProblem,
} from "@/hooks/useDiscovery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CreateSearchModal } from "./components/CreateSearchModal";

// Types
interface Platform {
    id: string;
    name: string;
    icon: string;
}

interface Competitor {
    name: string;
    url?: string;
    description?: string;
    pricing?: string;
    strengths?: string[];
    weaknesses?: string[];
    market_position?: string;
}

interface ImprovementOpportunity {
    area: string;
    description: string;
    difficulty?: string;
    impact?: string;
    title?: string;
    competitive_advantage?: string;
}

// NEW: Enhanced Market Analysis Types
interface MarketSizing {
    tam?: string;
    sam?: string;
    som?: string;
    growth_rate?: string;
    methodology?: string;
}

interface ValidationExperiment {
    experiment?: string;
    success_criteria?: string;
    time_required?: string;
    cost?: string;
}

interface ValidationMetrics {
    key_hypothesis?: string;
    validation_experiments?: ValidationExperiment[];
    leading_indicators?: string[];
    lagging_indicators?: string[];
}

interface RiskAssessment {
    market_risks?: string[];
    execution_risks?: string[];
    competitive_risks?: string[];
    overall_risk_level?: string;
}

interface RoadmapPhase {
    duration?: string;
    goal?: string;
    features?: string[];
    success_metric?: string;
    budget_estimate?: string;
    key_investments?: string[];
}

interface ExecutionRoadmap {
    phase_1_mvp?: RoadmapPhase;
    phase_2_launch?: RoadmapPhase;
    phase_3_scale?: RoadmapPhase;
}

interface ComparableExit {
    company?: string;
    exit_type?: string;
    valuation?: string;
    acquirer?: string;
    year?: string;
    relevance?: string;
}

interface TargetAudienceDetail {
    primary_segment?: string;
    job_titles?: string[];
    company_size?: string;
    industries?: string[];
    psychographics?: string;
    pain_intensity?: string | number;
    current_alternatives?: string;
}

interface MonetizationDetail {
    pricing_strategy?: string;
    price_point_range?: string;
    revenue_per_customer?: string;
    ltv_estimate?: string;
    path_to_1m_arr?: string;
    upsell_opportunities?: string[];
}

interface SuggestedApproach {
    approach?: string;
    description?: string;
    positioning?: string;
    differentiation?: string;
    initial_feature_set?: string[];
    go_to_market?: string;
}

interface ProblemInsight {
    // Core analysis
    job_to_be_done?: string;
    score_reasoning?: string;
    demand_signals?: string[];

    // Competitive Intelligence
    competitors?: Competitor[];
    market_gaps?: string[];
    improvement_opportunities?: ImprovementOpportunity[];

    // NEW: Enhanced Market Analysis
    market_sizing?: MarketSizing;
    validation_metrics?: ValidationMetrics;
    risk_assessment?: RiskAssessment;
    execution_roadmap?: ExecutionRoadmap;
    comparable_exits?: ComparableExit[];

    // Legacy fields
    existing_solutions?: string[];
    solution_gaps?: string[];
    market_size_estimate?: string;

    // Actionable insights (support both string and object format)
    suggested_approaches?: (string | SuggestedApproach)[];
    target_audience?: string | TargetAudienceDetail;
    monetization_potential?: string | MonetizationDetail;
    recommended_next_steps?: string[];

    // Meta
    model_used?: string;
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
    discovered_at: string;
    opportunity_score: number | null;
    category: string | null;
    problem_summary: string | null;
    insight?: ProblemInsight;
}

interface SearchJob {
    id: string;
    name: string;
    keywords: string[];
    platforms: string[];
    status: string;
    total_results: number;
    created_at: string;
}

// Platform icon map
const platformIcons: Record<string, string> = {
    reddit: "🔴",
    hackernews: "🟠",
    twitter: "🐦",
    indiehackers: "💼",
    quora: "❓",
    producthunt: "🚀",
};

// Platform badge colors - updated to match Command Center
const platformColors: Record<string, { bg: string; border: string; text: string }> = {
    reddit: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
    hackernews: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
    twitter: { bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-400" },
    indiehackers: { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400" },
    quora: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400" },
    producthunt: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
    g2: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },
    capterra: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
};

// Score color
function getScoreColor(score: number | null): string {
    if (!score) return "text-gray-500";
    if (score >= 8) return "text-emerald-400";
    if (score >= 6) return "text-amber-400";
    if (score >= 4) return "text-orange-400";
    return "text-rose-400";
}

export default function DiscoverPage() {
    // ========================
    // React Query Hooks (replaces useState + useEffect + fetch)
    // ========================
    const { data: platformsData } = usePlatforms();
    const { data: keywordsData } = useKeywords();
    const {
        data: problems = [],
        isLoading: loading,
        error: problemsError,
        refetch: refetchProblems
    } = useProblems({ limit: 100 });
    const { data: jobs = [], refetch: refetchJobs } = useSearchJobs({ limit: 20 });

    // Mutations
    const createSearchJob = useCreateSearchJob();
    const runSearchJob = useRunSearchJob();
    const toggleSaveMutation = useToggleProblemSave();
    const analyzeMutation = useAnalyzeProblem();

    // Derived state from React Query data
    const platforms = platformsData?.platforms || [];
    const defaultKeywords = keywordsData?.keywords || [];
    const error = problemsError?.message || createSearchJob.error?.message || null;

    // ========================
    // Local UI State Only (not data)
    // ========================
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filterPlatform, setFilterPlatform] = useState<string>("");
    const [filterSaved, setFilterSaved] = useState(false);
    const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"problems" | "trends">("problems");

    // ========================
    // Derived/Computed Values (memoized)
    // ========================
    const filteredProblems = useMemo(() => {
        return problems.filter((p: DiscoveredProblem) => {
            if (filterPlatform && p.platform !== filterPlatform) return false;
            if (filterSaved && !p.is_saved) return false;
            return true;
        });
    }, [problems, filterPlatform, filterSaved]);

    // Track which problem is being analyzed
    const analyzing = analyzeMutation.isPending ? analyzeMutation.variables : null;
    const creating = createSearchJob.isPending;

    // ========================
    // Action Handlers (using mutations)
    // ========================
    async function handleCreateJob(data: {
        name: string;
        keywords: string[];
        platforms: string[];
        max_results: number;
        time_filter: string;
    }) {
        try {
            const job = await createSearchJob.mutateAsync(data);
            setShowCreateModal(false);
            // Auto-run the job
            await runSearchJob.mutateAsync(job.id);
        } catch (e) {
            console.error("Failed to create job:", e);
        }
    }

    async function runJob(jobId: string) {
        try {
            await runSearchJob.mutateAsync(jobId);
        } catch (e) {
            console.error("Failed to run job:", e);
        }
    }

    function toggleSave(problemId: string) {
        toggleSaveMutation.mutate(problemId);
    }

    function analyzeProblem(problemId: string) {
        analyzeMutation.mutate(problemId, {
            onSuccess: () => {
                setExpandedProblem(problemId);
            },
        });
    }

    // Refresh all data
    function fetchData() {
        refetchProblems();
        refetchJobs();
    }

    // Legacy function for expanding problem (kept for compatibility)
    function fetchProblemDetails(problemId: string) {
        // With React Query, invalidation handles this automatically
        refetchProblems();
    }


    // Toggle expanded view
    function toggleExpand(problemId: string) {
        if (expandedProblem === problemId) {
            setExpandedProblem(null);
        } else {
            setExpandedProblem(problemId);
            // Fetch full details if not already loaded
            const problem = problems.find(p => p.id === problemId);
            if (problem?.opportunity_score && !problem?.insight) {
                fetchProblemDetails(problemId);
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050810] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050810]">
            <div className="space-y-6 pb-20 -m-6">
                {/* Page Header - Matching Command Center */}
                {/* Page Header - Matching Command Center */}
                <PageHeader
                    title="Problem Discovery"
                    description="AI-powered market signal analysis"
                    icon={Lightbulb}
                    iconColor="text-teal-400"
                    iconBg="bg-gradient-to-br from-teal-500/20 to-violet-500/20"
                    actions={
                        <>
                            <button
                                onClick={fetchData}
                                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 hover:text-white transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/20"
                            >
                                <Sparkles className="w-4 h-4" />
                                New Signal Search
                            </button>
                            <BulkAnalyzeButton onComplete={() => fetchData()} />
                        </>
                    }
                />

                <div className="px-6 space-y-6">
                    {/* Stats Grid - Premium Style */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Total Discovered", value: problems.length, icon: Search, color: "teal" },
                            { label: "Saved Opportunities", value: problems.filter(p => p.is_saved).length, icon: Bookmark, color: "amber" },
                            { label: "AI Analyzed", value: problems.filter(p => p.opportunity_score).length, icon: Sparkles, color: "violet" },
                            { label: "High Potential (8+)", value: problems.filter(p => (p.opportunity_score || 0) >= 8).length, icon: TrendingUp, color: "emerald" }
                        ].map((stat, idx) => {
                            const colorConfig: Record<string, { bg: string; text: string; glow: string }> = {
                                teal: { bg: "bg-teal-500/10", text: "text-teal-400", glow: "from-teal-500/20" },
                                amber: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "from-amber-500/20" },
                                violet: { bg: "bg-violet-500/10", text: "text-violet-400", glow: "from-violet-500/20" },
                                emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "from-emerald-500/20" },
                            };
                            const config = colorConfig[stat.color];
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                >
                                    <Card className="group relative border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden bg-[#0f172a]">
                                        <div className={`absolute inset-0 bg-gradient-to-br ${config.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                        <CardContent className="p-5 flex items-center justify-between relative z-10">
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{stat.label}</p>
                                                <p className="text-3xl font-bold text-white">{stat.value}</p>
                                            </div>
                                            <div className={`p-3 rounded-xl ${config.bg} ${config.text} group-hover:scale-110 transition-transform`}>
                                                <stat.icon className="w-5 h-5" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="glass rounded-xl p-4 border border-rose-500/30 bg-rose-500/10 flex items-center gap-3 text-rose-200"
                            >
                                <AlertCircle className="w-5 h-5" />
                                <p>{error}</p>
                                <button onClick={() => refetchProblems()} className="ml-auto hover:text-white"><X className="w-4 h-4" /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content Area */}
                    <div className="space-y-6">
                        {/* View Toggle + Filters Toolbar */}
                        <div className="flex flex-wrap items-center gap-4 p-1">
                            {/* View Toggle */}
                            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "problems" | "trends")} className="w-auto">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="problems" className="gap-2">
                                        <List className="w-4 h-4" /> Problems
                                    </TabsTrigger>
                                    <TabsTrigger value="trends" className="gap-2">
                                        <BarChart3 className="w-4 h-4" /> Trends
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* Export Button */}
                            <ExportButton platform={filterPlatform} onlySaved={filterSaved} />

                            {viewMode === "problems" && (
                                <>
                                    <div className="h-8 w-px bg-white/10 mx-2" />

                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-muted-foreground" />
                                        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                                            <SelectTrigger className="w-[180px] bg-white/[0.03] border-white/[0.05]">
                                                <SelectValue placeholder="All Platforms" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Platforms</SelectItem>
                                                {platforms.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="saved-filter"
                                            checked={filterSaved}
                                            onCheckedChange={(c) => setFilterSaved(!!c)}
                                            className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                        />
                                        <Label
                                            htmlFor="saved-filter"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300 cursor-pointer"
                                        >
                                            Saved Gems
                                        </Label>
                                    </div>

                                    <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                                        Showing {filteredProblems.length} results
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Content based on view mode */}
                        {viewMode === "trends" ? (
                            <TrendsWidget />
                        ) : (
                            /* Problems List */
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {filteredProblems.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            <Card className="p-16 text-center border-dashed border-white/10 bg-transparent">
                                                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-indigo-500/10 flex items-center justify-center">
                                                    <Search className="w-10 h-10 text-indigo-400 opacity-50" />
                                                </div>
                                                <h3 className="text-xl font-light text-white mb-2">No signals detected</h3>
                                                <p className="text-muted-foreground mb-8 font-light">Launch a new search agent to scan the horizon.</p>
                                                <Button onClick={() => setShowCreateModal(true)} variant="default">
                                                    Initialize Search
                                                </Button>
                                            </Card>
                                        </motion.div>
                                    ) : (
                                        filteredProblems.map((problem) => (
                                            <motion.div
                                                key={problem.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <Card className={`group border-white/[0.06] hover:border-white/[0.12] bg-[#0f172a] overflow-hidden transition-all ${expandedProblem === problem.id ? 'ring-1 ring-indigo-500/30' : ''}`}>
                                                    <div className="p-5 flex items-start gap-5">
                                                        {/* Platform Icon */}
                                                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500 shrink-0">
                                                            {platformIcons[problem.platform] || "📝"}
                                                        </div>

                                                        {/* Main Content */}
                                                        <div className="flex-1 min-w-0 pt-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="text-lg font-medium text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                                                                        {problem.title}
                                                                    </h3>
                                                                    <a
                                                                        href={problem.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-gray-500 hover:text-white transition-colors"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </a>
                                                                </div>
                                                                <span className="text-xs font-mono text-gray-500 flex items-center gap-2">
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(problem.discovered_at).toLocaleDateString()}
                                                                </span>
                                                            </div>

                                                            <p className="text-gray-400 text-sm font-light leading-relaxed line-clamp-2 mb-4">
                                                                {problem.snippet}
                                                            </p>

                                                            {/* AI Insight Chip */}
                                                            {problem.problem_summary && (
                                                                <div className="inline-flex items-start gap-2 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 mb-4 max-w-full">
                                                                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                                                    <p className="text-sm text-indigo-200/80 font-light leading-snug">
                                                                        {problem.problem_summary}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Tags Row */}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {problem.keyword_matched && (
                                                                    <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-xs font-medium text-gray-400">
                                                                        #{problem.keyword_matched}
                                                                    </span>
                                                                )}
                                                                {problem.category && (
                                                                    <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400">
                                                                        {problem.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Score & Actions Column */}
                                                        <div className="flex flex-col items-end gap-3 shrink-0">
                                                            {problem.opportunity_score !== null ? (
                                                                <button
                                                                    onClick={() => toggleExpand(problem.id)}
                                                                    className="relative group/score"
                                                                >
                                                                    <div className={`text-4xl font-light tracking-tighter ${getScoreColor(problem.opportunity_score)}`}>
                                                                        {problem.opportunity_score}<span className="text-lg opacity-40">/10</span>
                                                                    </div>
                                                                    <div className="text-xs font-medium text-gray-500 text-right group-hover/score:text-indigo-400 transition-colors flex items-center justify-end gap-1">
                                                                        AI Score
                                                                        {expandedProblem === problem.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                    </div>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => analyzeProblem(problem.id)}
                                                                    disabled={analyzing === problem.id}
                                                                    className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-sm font-medium flex items-center gap-2 border border-indigo-500/20"
                                                                >
                                                                    {analyzing === problem.id ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Sparkles className="w-4 h-4" />
                                                                    )}
                                                                    Analyze Signal
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => toggleSave(problem.id)}
                                                                className={`p-2 rounded-lg transition-all ${problem.is_saved
                                                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                                    : "bg-white/5 text-gray-500 hover:text-white hover:bg-white/10"
                                                                    }`}
                                                            >
                                                                <Bookmark className="w-4 h-4" fill={problem.is_saved ? "currentColor" : "none"} />
                                                            </button>

                                                            {/* Add to Collection */}
                                                            <AddToCollectionDropdown problemId={problem.id} />
                                                        </div>
                                                    </div>

                                                    {/* Expanded Intelligence Panel */}
                                                    <AnimatePresence>
                                                        {expandedProblem === problem.id && problem.insight && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="border-t border-white/[0.05] bg-black/40 backdrop-blur-xl"
                                                            >
                                                                <div className="p-8 space-y-8">
                                                                    {/* HERO: Job to be Done */}
                                                                    {problem.insight.job_to_be_done && (
                                                                        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20">
                                                                            <div className="absolute top-0 left-0 p-4 opacity-10">
                                                                                <Target className="w-16 h-16 text-indigo-500" />
                                                                            </div>
                                                                            <h4 className="relative text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                                <Target className="w-4 h-4" /> Core Job to be Done
                                                                            </h4>
                                                                            <p className="relative text-xl md:text-2xl font-light text-indigo-50 leading-relaxed">
                                                                                "{problem.insight.job_to_be_done}"
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                                        {/* LEFT: Competitive Landscape */}
                                                                        <div className="space-y-4">
                                                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-white/5">
                                                                                <Building2 className="w-3 h-3 text-orange-400" />
                                                                                Competitive Landscape {problem.insight.competitors?.length ? `• ${problem.insight.competitors.length} Detected` : ''}
                                                                            </h4>

                                                                            <div className="space-y-3">
                                                                                {problem.insight.competitors && problem.insight.competitors.length > 0 ? (
                                                                                    problem.insight.competitors.map((comp, idx) => (
                                                                                        <div key={idx} className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-xl p-4 border border-white/[0.05] hover:border-orange-500/30 transition-all duration-300">
                                                                                            <div className="flex justify-between items-start mb-3">
                                                                                                <div>
                                                                                                    <h5 className="font-semibold text-white group-hover:text-orange-200 transition-colors">{comp.name}</h5>
                                                                                                    {comp.pricing && <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{comp.pricing}</span>}
                                                                                                </div>
                                                                                            </div>

                                                                                            {comp.description && (
                                                                                                <p className="text-sm text-gray-400 font-light mb-4 line-clamp-2">{comp.description}</p>
                                                                                            )}

                                                                                            <div className="flex gap-2 w-full">
                                                                                                {/* Strengths / Weaknesses Mini-Grid */}
                                                                                                <div className="flex-1 bg-emerald-500/5 rounded-lg p-2 border border-emerald-500/10">
                                                                                                    <div className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Strengths</div>
                                                                                                    <div className="flex flex-wrap gap-1">
                                                                                                        {(comp.strengths || []).slice(0, 2).map((s, i) => (
                                                                                                            <span key={i} className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">{s}</span>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex-1 bg-rose-500/5 rounded-lg p-2 border border-rose-500/10">
                                                                                                    <div className="text-[10px] text-rose-500 font-bold uppercase mb-1">Weaknesses</div>
                                                                                                    <div className="flex flex-wrap gap-1">
                                                                                                        {(comp.weaknesses || []).slice(0, 2).map((w, i) => (
                                                                                                            <span key={i} className="text-[10px] text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded">{w}</span>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                ) : (
                                                                                    <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
                                                                                        <p className="text-gray-500 text-sm">No direct competitors analyzed yet.</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* RIGHT: Market & Opportunities */}
                                                                        <div className="space-y-8">
                                                                            {/* Identified Gaps */}
                                                                            <div>
                                                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-white/5 mb-4">
                                                                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                                                                    Critical Market Gaps
                                                                                </h4>
                                                                                <div className="space-y-3">
                                                                                    {(problem.insight.market_gaps || problem.insight.solution_gaps || []).map((gap, i) => (
                                                                                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 hover:bg-amber-500/[0.06] transition-colors">
                                                                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold shrink-0 mt-0.5">
                                                                                                {i + 1}
                                                                                            </span>
                                                                                            <p className="text-sm text-gray-300 font-light leading-relaxed">{gap}</p>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            {/* Opportunities */}
                                                                            {problem.insight.improvement_opportunities?.length && (
                                                                                <div>
                                                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-white/5 mb-4">
                                                                                        <Zap className="w-3 h-3 text-purple-400" />
                                                                                        High-Value Opportunities
                                                                                    </h4>
                                                                                    <div className="grid gap-3">
                                                                                        {problem.insight.improvement_opportunities.map((opp, i) => (
                                                                                            <div key={i} className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-purple-500/[0.05] to-transparent border border-purple-500/10 group hover:border-purple-500/30 transition-all">
                                                                                                <div className="flex justify-between items-start mb-2">
                                                                                                    <span className="font-medium text-purple-200 text-sm">{opp.area}</span>
                                                                                                    {opp.impact === 'High' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium tracking-wide">HIGH IMPACT</span>}
                                                                                                </div>
                                                                                                <p className="text-xs text-gray-400 font-light leading-relaxed group-hover:text-gray-300 transition-colors">{opp.description}</p>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* NEW: Market Sizing Section */}
                                                                    {problem.insight.market_sizing && Object.keys(problem.insight.market_sizing).length > 0 && (
                                                                        <div className="p-5 rounded-xl bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-violet-500/10">
                                                                            <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                                <TrendingUp className="w-3 h-3" /> Market Sizing
                                                                            </h4>
                                                                            <div className="grid grid-cols-3 gap-4">
                                                                                {problem.insight.market_sizing.tam && (
                                                                                    <div className="text-center p-3 bg-white/[0.02] rounded-lg">
                                                                                        <div className="text-[10px] text-gray-500 uppercase mb-1">TAM</div>
                                                                                        <div className="text-sm text-violet-300 font-medium">{problem.insight.market_sizing.tam}</div>
                                                                                    </div>
                                                                                )}
                                                                                {problem.insight.market_sizing.sam && (
                                                                                    <div className="text-center p-3 bg-white/[0.02] rounded-lg">
                                                                                        <div className="text-[10px] text-gray-500 uppercase mb-1">SAM</div>
                                                                                        <div className="text-sm text-violet-300 font-medium">{problem.insight.market_sizing.sam}</div>
                                                                                    </div>
                                                                                )}
                                                                                {problem.insight.market_sizing.som && (
                                                                                    <div className="text-center p-3 bg-white/[0.02] rounded-lg">
                                                                                        <div className="text-[10px] text-gray-500 uppercase mb-1">SOM</div>
                                                                                        <div className="text-sm text-violet-300 font-medium">{problem.insight.market_sizing.som}</div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {problem.insight.market_sizing.growth_rate && (
                                                                                <p className="mt-3 text-xs text-gray-400">Growth: {problem.insight.market_sizing.growth_rate}</p>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* NEW: Risk Assessment Section */}
                                                                    {problem.insight.risk_assessment && Object.keys(problem.insight.risk_assessment).length > 0 && (
                                                                        <div className="p-5 rounded-xl bg-gradient-to-r from-rose-500/5 to-orange-500/5 border border-rose-500/10">
                                                                            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                                <AlertTriangle className="w-3 h-3" /> Risk Assessment
                                                                                {problem.insight.risk_assessment.overall_risk_level && (
                                                                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${problem.insight.risk_assessment.overall_risk_level === 'Low' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                                        problem.insight.risk_assessment.overall_risk_level === 'High' ? 'bg-rose-500/20 text-rose-400' :
                                                                                            'bg-amber-500/20 text-amber-400'
                                                                                        }`}>
                                                                                        {problem.insight.risk_assessment.overall_risk_level}
                                                                                    </span>
                                                                                )}
                                                                            </h4>
                                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                {problem.insight.risk_assessment.market_risks && problem.insight.risk_assessment.market_risks.length > 0 && (
                                                                                    <div className="p-3 bg-white/[0.02] rounded-lg">
                                                                                        <div className="text-[10px] text-rose-400 font-medium mb-2">Market Risks</div>
                                                                                        {problem.insight.risk_assessment.market_risks.slice(0, 2).map((r, i) => (
                                                                                            <p key={i} className="text-[11px] text-gray-400 mb-1">• {r}</p>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                                {problem.insight.risk_assessment.execution_risks && problem.insight.risk_assessment.execution_risks.length > 0 && (
                                                                                    <div className="p-3 bg-white/[0.02] rounded-lg">
                                                                                        <div className="text-[10px] text-orange-400 font-medium mb-2">Execution Risks</div>
                                                                                        {problem.insight.risk_assessment.execution_risks.slice(0, 2).map((r, i) => (
                                                                                            <p key={i} className="text-[11px] text-gray-400 mb-1">• {r}</p>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                                {problem.insight.risk_assessment.competitive_risks && problem.insight.risk_assessment.competitive_risks.length > 0 && (
                                                                                    <div className="p-3 bg-white/[0.02] rounded-lg">
                                                                                        <div className="text-[10px] text-amber-400 font-medium mb-2">Competitive Risks</div>
                                                                                        {problem.insight.risk_assessment.competitive_risks.slice(0, 2).map((r, i) => (
                                                                                            <p key={i} className="text-[11px] text-gray-400 mb-1">• {r}</p>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* NEW: Execution Roadmap Section */}
                                                                    {problem.insight.execution_roadmap && Object.keys(problem.insight.execution_roadmap).length > 0 && (
                                                                        <div className="p-5 rounded-xl bg-gradient-to-r from-teal-500/5 to-cyan-500/5 border border-teal-500/10">
                                                                            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                                <ArrowRight className="w-3 h-3" /> Execution Roadmap
                                                                            </h4>
                                                                            <div className="flex gap-4 overflow-x-auto pb-2">
                                                                                {problem.insight.execution_roadmap.phase_1_mvp && (
                                                                                    <div className="flex-1 min-w-[200px] p-3 bg-white/[0.02] rounded-lg border border-teal-500/10">
                                                                                        <div className="text-[10px] text-teal-400 font-bold mb-2">Phase 1: MVP</div>
                                                                                        {problem.insight.execution_roadmap.phase_1_mvp.duration && (
                                                                                            <p className="text-[10px] text-gray-500 mb-1">⏱ {problem.insight.execution_roadmap.phase_1_mvp.duration}</p>
                                                                                        )}
                                                                                        <p className="text-xs text-gray-300">{problem.insight.execution_roadmap.phase_1_mvp.goal}</p>
                                                                                    </div>
                                                                                )}
                                                                                {problem.insight.execution_roadmap.phase_2_launch && (
                                                                                    <div className="flex-1 min-w-[200px] p-3 bg-white/[0.02] rounded-lg border border-cyan-500/10">
                                                                                        <div className="text-[10px] text-cyan-400 font-bold mb-2">Phase 2: Launch</div>
                                                                                        {problem.insight.execution_roadmap.phase_2_launch.duration && (
                                                                                            <p className="text-[10px] text-gray-500 mb-1">⏱ {problem.insight.execution_roadmap.phase_2_launch.duration}</p>
                                                                                        )}
                                                                                        <p className="text-xs text-gray-300">{problem.insight.execution_roadmap.phase_2_launch.goal}</p>
                                                                                    </div>
                                                                                )}
                                                                                {problem.insight.execution_roadmap.phase_3_scale && (
                                                                                    <div className="flex-1 min-w-[200px] p-3 bg-white/[0.02] rounded-lg border border-indigo-500/10">
                                                                                        <div className="text-[10px] text-indigo-400 font-bold mb-2">Phase 3: Scale</div>
                                                                                        {problem.insight.execution_roadmap.phase_3_scale.duration && (
                                                                                            <p className="text-[10px] text-gray-500 mb-1">⏱ {problem.insight.execution_roadmap.phase_3_scale.duration}</p>
                                                                                        )}
                                                                                        <p className="text-xs text-gray-300">{problem.insight.execution_roadmap.phase_3_scale.goal}</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Strategy Footer - Updated to handle complex types */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                                                        <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.05]">
                                                                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                                <Users className="w-3 h-3" /> Target Audience
                                                                            </div>
                                                                            <p className="text-sm text-gray-300 font-light leading-relaxed">
                                                                                {typeof problem.insight.target_audience === 'string'
                                                                                    ? problem.insight.target_audience
                                                                                    : problem.insight.target_audience?.primary_segment || "N/A"}
                                                                            </p>
                                                                        </div>
                                                                        <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.05]">
                                                                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                                <DollarSign className="w-3 h-3" /> Monetization Strategy
                                                                            </div>
                                                                            <p className="text-sm text-gray-300 font-light leading-relaxed">
                                                                                {typeof problem.insight.monetization_potential === 'string'
                                                                                    ? problem.insight.monetization_potential
                                                                                    : problem.insight.monetization_potential?.pricing_strategy || "N/A"}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Next Steps CTA */}
                                                                    {problem.insight.recommended_next_steps && (
                                                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10">
                                                                            <div className="shrink-0 p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                                                                <CheckCircle className="w-5 h-5" />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <h4 className="text-sm font-bold text-emerald-400 mb-1">Recommended Next Steps</h4>
                                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                                    {problem.insight.recommended_next_steps.slice(0, 3).map((step, i) => (
                                                                                        <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-300/80 text-xs border border-emerald-500/20 rounded-full">
                                                                                            {step}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Metadata Footer */}
                                                                    <div className="flex justify-between items-center pt-2 text-[10px] text-gray-600">
                                                                        <span>Model: {problem.insight.model_used || "Unknown"}</span>
                                                                        <span>Analyzed: {problem.insight.analyzed_at && new Date(problem.insight.analyzed_at).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </Card>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Create Modal */}
                    <CreateSearchModal
                        open={showCreateModal}
                        onOpenChange={setShowCreateModal}
                        platforms={platforms as { id: string; name: string; icon: string }[]}
                        defaultKeywords={defaultKeywords}
                        onSubmit={handleCreateJob}
                        isCreating={creating}
                    />
                </div>
            </div>
        </div>
    );
}
