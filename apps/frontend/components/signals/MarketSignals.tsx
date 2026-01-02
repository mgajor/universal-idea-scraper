"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Briefcase,
    Newspaper,
    Users,
    Code,
    ShoppingCart,
    TrendingUp,
    ExternalLink,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Zap,
    Search,
    Star,
    Rocket,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

// Types for market signals
interface MarketSignal {
    id: string;
    source_type: "jobs" | "news" | "social" | "developer" | "ecommerce" | "search" | "reviews" | "startups";
    source_name: string;
    title: string;
    description?: string;
    url?: string;
    relevance_score: number;
    volume: number;
    velocity: number;
    raw_data: Record<string, any>;
    fetched_at: string;
}

interface SignalsSummary {
    problem_id: string;
    confidence_score: number;
    total_signals: number;
    by_type: Record<string, { count: number; avg_relevance?: number; total_volume?: number; top_sources?: string[] }>;
    top_sources: string[];
    signals: MarketSignal[];
    // AI Analysis fields
    ai_validation_summary?: string;
    ai_confidence_score?: number;
    ai_confidence_explanation?: string;
    ai_market_validation?: string;
    ai_key_insights?: {
        jobs?: string[];
        news?: string[];
        social?: string[];
    };
    ai_key_findings?: string[];
    ai_red_flags?: string[];
    ai_recommendations?: string[];
    ai_next_steps?: string[];
    ai_analyzed_at?: string;
}

// Source type configurations
const SOURCE_CONFIG = {
    jobs: {
        icon: Briefcase,
        label: "Job Signals",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
    },
    news: {
        icon: Newspaper,
        label: "News Signals",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
    },
    social: {
        icon: Users,
        label: "Social Signals",
        color: "text-pink-400",
        bg: "bg-pink-500/10",
        border: "border-pink-500/20",
    },
    developer: {
        icon: Code,
        label: "Developer Signals",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/20",
    },
    ecommerce: {
        icon: ShoppingCart,
        label: "E-commerce Signals",
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
    },
    search: {
        icon: Search,
        label: "Search Signals",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
    },
    reviews: {
        icon: Star,
        label: "Review Signals",
        color: "text-yellow-400",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
    },
    startups: {
        icon: Rocket,
        label: "Startup Signals",
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
    },
};

// Confidence score badge
function ConfidenceScoreBadge({ score }: { score: number }) {
    const percentage = Math.round(score * 100);
    const getColor = () => {
        if (percentage >= 70) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        if (percentage >= 40) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        return "text-red-400 bg-red-500/10 border-red-500/20";
    };

    return (
        <div className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 ${getColor()}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            {percentage}% Confidence
        </div>
    );
}

// Individual signal card
function SignalCard({ signal }: { signal: MarketSignal }) {
    const config = SOURCE_CONFIG[signal.source_type] || SOURCE_CONFIG.news;
    const Icon = config.icon;

    return (
        <motion.div
            className={`p-3 rounded-lg border ${config.border} ${config.bg} space-y-2`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                    <span className="text-xs font-medium text-gray-400 truncate">
                        {signal.source_name.replace(/_/g, " ")}
                    </span>
                </div>
                {signal.volume > 0 && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                        {signal.volume.toLocaleString()} {signal.source_type === "jobs" ? "postings" : "engagements"}
                    </span>
                )}
            </div>
            <p className="text-sm text-white font-medium line-clamp-2">
                {signal.title}
            </p>
            {signal.url && (
                <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs ${config.color} hover:underline flex items-center gap-1 truncate`}
                >
                    <ExternalLink className="w-3 h-3" />
                    View source
                </a>
            )}
        </motion.div>
    );
}

// Signal type summary card
function SignalTypeSummary({
    type,
    data,
    signals,
}: {
    type: keyof typeof SOURCE_CONFIG;
    data: { count: number; avg_relevance?: number; total_volume?: number; top_sources?: string[] };
    signals: MarketSignal[];
}) {
    const [expanded, setExpanded] = useState(false);
    const config = SOURCE_CONFIG[type];
    const Icon = config.icon;

    return (
        <div className={`rounded-xl border ${config.border} overflow-hidden`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full p-4 flex items-center justify-between ${config.bg} hover:bg-white/[0.02] transition-colors`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-white">{config.label}</div>
                        <div className="text-xs text-gray-500">
                            {data.count} signal{data.count !== 1 ? "s" : ""}
                            {data.top_sources?.length ? ` from ${data.top_sources.length} source${data.top_sources.length !== 1 ? "s" : ""}` : ""}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {data.total_volume !== undefined && data.total_volume > 0 && (
                        <span className="text-xs text-gray-400">
                            {data.total_volume.toLocaleString()} total
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>
            {expanded && signals.length > 0 && (
                <div className="p-3 space-y-2 bg-black/20">
                    {signals.slice(0, 5).map((signal) => (
                        <SignalCard key={signal.id} signal={signal} />
                    ))}
                </div>
            )}
        </div>
    );
}

// AI Analysis Section
function AIAnalysisSection({ data }: { data: SignalsSummary }) {
    const [expanded, setExpanded] = useState(false);

    if (!data.ai_validation_summary) {
        return null;
    }

    const getValidationColor = () => {
        const validation = data.ai_market_validation?.toLowerCase() || "";
        if (validation.includes("strong")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        if (validation.includes("moderate")) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        return "text-red-400 bg-red-500/10 border-red-500/20";
    };

    return (
        <div className="space-y-4">
            {/* AI Confidence Badge */}
            <div className="flex items-center justify-between">
                <div className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 ${getValidationColor()}`}>
                    <Zap className="w-3.5 h-3.5" />
                    {data.ai_market_validation || "Unknown"} Validation • {data.ai_confidence_score}% AI Confidence
                </div>
            </div>

            {/* Validation Summary */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        AI Market Analysis
                    </h4>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-gray-400 hover:text-white"
                    >
                        {expanded ? "Show less" : "Show more"}
                    </button>
                </div>

                {/* Confidence Explanation */}
                {data.ai_confidence_explanation && (
                    <p className="text-xs text-gray-400 italic mb-3">
                        {data.ai_confidence_explanation}
                    </p>
                )}

                {/* Summary - always show first paragraph */}
                <p className="text-sm text-gray-300 whitespace-pre-line">
                    {expanded
                        ? data.ai_validation_summary
                        : data.ai_validation_summary?.split('\n\n')[0] || data.ai_validation_summary}
                </p>
            </div>

            {/* Key Findings */}
            {data.ai_key_findings && data.ai_key_findings.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <h4 className="text-sm font-medium text-emerald-400 mb-2">Key Findings</h4>
                    <ul className="space-y-1.5">
                        {data.ai_key_findings.slice(0, expanded ? undefined : 3).map((finding, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                {finding}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Red Flags */}
            {expanded && data.ai_red_flags && data.ai_red_flags.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                    <h4 className="text-sm font-medium text-red-400 mb-2">Concerns & Red Flags</h4>
                    <ul className="space-y-1.5">
                        {data.ai_red_flags.map((flag, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">⚠</span>
                                {flag}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommendations */}
            {expanded && data.ai_recommendations && data.ai_recommendations.length > 0 && (
                <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                    <h4 className="text-sm font-medium text-violet-400 mb-2">Recommendations</h4>
                    <ul className="space-y-1.5">
                        {data.ai_recommendations.map((rec, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-violet-400 mt-0.5">{i + 1}.</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Next Steps */}
            {expanded && data.ai_next_steps && data.ai_next_steps.length > 0 && (
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                    <h4 className="text-sm font-medium text-cyan-400 mb-2">Next Steps</h4>
                    <ul className="space-y-1.5">
                        {data.ai_next_steps.map((step, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-cyan-400 mt-0.5">→</span>
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// Main Market Signals component
export function MarketSignals({
    problemId,
    onEnrich,
}: {
    problemId: string;
    onEnrich?: () => void;
}) {
    const [data, setData] = useState<SignalsSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch signals for this problem
    const fetchSignals = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/discovery/signals/${problemId}`);
            if (!response.ok) throw new Error("Failed to fetch signals");
            const result = await response.json();
            setData(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load signals");
        } finally {
            setLoading(false);
        }
    };

    // Trigger multi-source enrichment
    const triggerEnrichment = async () => {
        setEnriching(true);
        setError(null);
        try {
            const response = await fetch(
                `${API_BASE}/discovery/problems/${problemId}/enrich-multi`,
                { method: "POST", headers: { "Content-Type": "application/json" } }
            );
            if (!response.ok) throw new Error("Enrichment failed");
            const result = await response.json();
            // Refresh signals after enrichment
            await fetchSignals();
            onEnrich?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Enrichment failed");
        } finally {
            setEnriching(false);
        }
    };

    // Initial load
    useState(() => {
        fetchSignals();
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-teal-400 animate-spin" />
            </div>
        );
    }

    // No data yet - show enrich CTA
    if (!data || data.total_signals === 0) {
        return (
            <div className="space-y-4">
                <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-4">
                        No market signals collected yet.
                    </p>
                    <button
                        onClick={triggerEnrichment}
                        disabled={enriching}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium hover:from-teal-400 hover:to-cyan-400 transition-all disabled:opacity-50"
                    >
                        {enriching ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Fetching signals...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                Fetch Market Signals
                            </>
                        )}
                    </button>
                </div>
                {error && (
                    <p className="text-xs text-red-400 text-center">{error}</p>
                )}
            </div>
        );
    }

    // Group signals by type
    const signalsByType: Record<string, MarketSignal[]> = {};
    data.signals.forEach((signal) => {
        if (!signalsByType[signal.source_type]) {
            signalsByType[signal.source_type] = [];
        }
        signalsByType[signal.source_type].push(signal);
    });

    return (
        <div className="space-y-4">
            {/* Header with confidence score */}
            <div className="flex items-center justify-between">
                <ConfidenceScoreBadge score={data.confidence_score} />
                <button
                    onClick={triggerEnrichment}
                    disabled={enriching}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${enriching ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Signal count summary */}
            <div className="text-xs text-gray-500">
                {data.total_signals} signals from {data.top_sources?.length || 0} sources
            </div>

            {/* AI Analysis Section */}
            {data.ai_validation_summary && (
                <AIAnalysisSection data={data} />
            )}

            {/* Signal type cards */}
            <div className="space-y-3">
                {Object.entries(data.by_type).map(([type, typeData]) => (
                    <SignalTypeSummary
                        key={type}
                        type={type as keyof typeof SOURCE_CONFIG}
                        data={typeData}
                        signals={signalsByType[type] || []}
                    />
                ))}
            </div>

            {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
            )}
        </div>
    );
}

export default MarketSignals;
