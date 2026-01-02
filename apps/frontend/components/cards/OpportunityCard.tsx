"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Lightbulb,
    Bookmark,
    BookmarkCheck,
    TrendingUp,
    Users,
    DollarSign,
    Clock,
    ExternalLink,
    Sparkles,
    ChevronRight,
    Flame,
    Target,
    Zap,
} from "lucide-react";

// Types
export interface OpportunityData {
    id: string;
    title: string;
    problemStatement: string;
    platform: string;

    // Market signal metrics
    signalStrength: number; // 0-100
    postCount: number;
    trendDirection: "up" | "down" | "stable";
    trendPercent: number;
    momentum: "hot" | "warm" | "cool";
    daysActive: number;

    // Opportunity metrics
    implementationWeeks: string; // e.g., "2-4"
    implementationDifficulty: "easy" | "medium" | "hard";
    tamRange: string; // e.g., "$2M-$10M"
    tamConfidence: "high" | "medium" | "low";
    fitScore?: number; // 0-100 (optional for v1)

    // Audience & monetization
    audiences: string[];
    monetization: string[];

    // AI analysis
    isAnalyzed: boolean;
    opportunityScore?: number;
    category?: string;

    // State
    isSaved: boolean;
}

interface OpportunityCardProps {
    opportunity: OpportunityData;
    onExplore?: (id: string) => void;
    onSave?: (id: string) => void;
    onAnalyze?: (id: string) => void;
    isSelected?: boolean;
}

// Signal strength bar component
function SignalBar({ value, label, sublabel, color = "primary" }: {
    value: number;
    label: string;
    sublabel?: string;
    color?: "primary" | "amber"
}) {
    const fillColor = color === "amber"
        ? "bg-gradient-to-r from-amber-600 to-amber-400"
        : "bg-gradient-to-r from-teal-600 to-teal-400";

    return (
        <div className="flex-1">
            <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {label}
                </span>
                {sublabel && (
                    <span className="text-[10px] text-gray-500">{sublabel}</span>
                )}
            </div>
            <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${fillColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(value, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}

// Metric row with colored indicator
function MetricRow({
    signal,
    label,
    value
}: {
    signal: "green" | "amber" | "red" | "blue";
    label: string;
    value: string;
}) {
    const signalColors = {
        green: "bg-emerald-500",
        amber: "bg-amber-500",
        red: "bg-rose-500",
        blue: "bg-blue-500",
    };

    return (
        <div className="flex items-center gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full ${signalColors[signal]}`} />
            <span className="text-xs text-gray-400">{label}:</span>
            <span className="text-xs text-gray-200 font-medium">{value}</span>
        </div>
    );
}

// Momentum badge
function MomentumBadge({ momentum, days }: { momentum: "hot" | "warm" | "cool"; days: number }) {
    const config = {
        hot: { icon: Flame, color: "text-orange-400 bg-orange-500/10", label: "Hot" },
        warm: { icon: TrendingUp, color: "text-amber-400 bg-amber-500/10", label: "Warm" },
        cool: { icon: Target, color: "text-blue-400 bg-blue-500/10", label: "Steady" },
    };

    const { icon: Icon, color, label } = config[momentum];

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${color}`}>
            <Icon className="w-3 h-3" />
            <span className="text-[10px] font-semibold">{label}</span>
            <span className="text-[10px] text-gray-500">• {days}d</span>
        </div>
    );
}

export function OpportunityCard({
    opportunity,
    onExplore,
    onSave,
    onAnalyze,
    isSelected = false,
}: OpportunityCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Determine difficulty signal
    const difficultySignal = {
        easy: "green" as const,
        medium: "amber" as const,
        hard: "red" as const,
    }[opportunity.implementationDifficulty];

    // Determine TAM signal
    const tamSignal = {
        high: "green" as const,
        medium: "amber" as const,
        low: "red" as const,
    }[opportunity.tamConfidence];

    return (
        <motion.div
            className={`
                relative bg-[#111827] rounded-2xl overflow-hidden
                border transition-all duration-200 cursor-pointer
                ${isSelected
                    ? "border-teal-500/50 shadow-[0_0_40px_rgba(20,184,166,0.15)]"
                    : "border-white/[0.06] hover:border-white/[0.12]"
                }
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => onExplore?.(opportunity.id)}
        >
            {/* Header */}
            <div className="p-5 pb-4">
                {/* Platform & Score badges */}
                <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-gray-400">
                        {opportunity.platform}
                    </span>
                    {opportunity.isAnalyzed && opportunity.opportunityScore && (
                        <div className={`
                            px-2 py-0.5 rounded-full text-[10px] font-bold
                            ${opportunity.opportunityScore >= 8
                                ? "bg-emerald-500/20 text-emerald-400"
                                : opportunity.opportunityScore >= 6
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-gray-500/20 text-gray-400"
                            }
                        `}>
                            {opportunity.opportunityScore}/10
                        </div>
                    )}
                </div>

                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                            <Lightbulb className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                                {opportunity.title}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSave?.(opportunity.id);
                        }}
                        className={`
                            p-1.5 rounded-lg transition-all shrink-0
                            ${opportunity.isSaved
                                ? "text-amber-400 bg-amber-500/10"
                                : "text-gray-500 hover:text-amber-400 hover:bg-amber-500/10"
                            }
                        `}
                    >
                        {opportunity.isSaved ? (
                            <BookmarkCheck className="w-4 h-4" />
                        ) : (
                            <Bookmark className="w-4 h-4" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {opportunity.problemStatement}
                </p>
            </div>

            {/* Signal Bars */}
            <div className="px-5 pb-4">
                <div className="flex gap-6">
                    <SignalBar
                        value={opportunity.signalStrength}
                        label="Market Signal"
                        sublabel={`${opportunity.postCount} posts (${opportunity.trendDirection === "up" ? "↑" : opportunity.trendDirection === "down" ? "↓" : "→"}${opportunity.trendPercent}%)`}
                        color="primary"
                    />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Momentum
                        </span>
                        <MomentumBadge momentum={opportunity.momentum} days={opportunity.daysActive} />
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.04] mx-5" />

            {/* Metrics */}
            <div className="px-5 py-4 space-y-2.5">
                <MetricRow
                    signal={difficultySignal}
                    label="Implementation"
                    value={`${opportunity.implementationWeeks} weeks`}
                />
                <MetricRow
                    signal={tamSignal}
                    label="TAM"
                    value={opportunity.tamRange}
                />
                {opportunity.fitScore && (
                    <MetricRow
                        signal={opportunity.fitScore >= 80 ? "green" : opportunity.fitScore >= 50 ? "amber" : "red"}
                        label="Your Fit"
                        value={`${opportunity.fitScore}%`}
                    />
                )}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.04] mx-5" />

            {/* Audience & Monetization */}
            <div className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                        <span className="text-gray-500">Audience:</span>{" "}
                        {opportunity.audiences.slice(0, 2).join(", ")}
                    </p>
                </div>
                <div className="flex items-start gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                        <span className="text-gray-500">Monetization:</span>{" "}
                        {opportunity.monetization.slice(0, 3).join(", ")}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-black/20 border-t border-white/[0.04]">
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onExplore?.(opportunity.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-medium hover:bg-teal-500/20 transition-colors"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Explore
                    </button>

                    {!opportunity.isAnalyzed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAnalyze?.(opportunity.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/[0.03] text-gray-400 text-xs font-medium hover:bg-white/[0.06] hover:text-white transition-colors border border-white/[0.06]"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Analyze
                        </button>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Open source posts
                        }}
                        className="p-2 rounded-lg bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white transition-colors border border-white/[0.06]"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Badges are now inline in header, removing absolute positioning */}
        </motion.div>
    );
}

// Skeleton loader for cards
export function OpportunityCardSkeleton() {
    return (
        <div className="bg-[#111827] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="p-5 space-y-4">
                {/* Header skeleton */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse" />
                    </div>
                </div>
                <div className="h-3 w-full bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-gray-800 rounded animate-pulse" />
            </div>

            <div className="px-5 pb-4 space-y-3">
                <div className="h-1.5 w-full bg-gray-800 rounded-full animate-pulse" />
                <div className="flex gap-4">
                    <div className="h-6 w-20 bg-gray-800 rounded-full animate-pulse" />
                    <div className="h-6 w-16 bg-gray-800 rounded-full animate-pulse" />
                </div>
            </div>

            <div className="px-5 py-4 border-t border-white/[0.04] space-y-2">
                <div className="h-3 w-1/2 bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-gray-800 rounded animate-pulse" />
            </div>

            <div className="px-5 py-4 bg-black/20 border-t border-white/[0.04]">
                <div className="flex gap-2">
                    <div className="h-9 flex-1 bg-gray-800 rounded-lg animate-pulse" />
                    <div className="h-9 flex-1 bg-gray-800 rounded-lg animate-pulse" />
                    <div className="h-9 w-9 bg-gray-800 rounded-lg animate-pulse" />
                </div>
            </div>
        </div>
    );
}

export default OpportunityCard;
