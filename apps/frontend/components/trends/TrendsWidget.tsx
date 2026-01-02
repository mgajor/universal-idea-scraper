"use client";

import { useState, useEffect } from "react";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Activity,
    BarChart3,
    Flame,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api";

// Platform icons
const platformIcons: Record<string, string> = {
    reddit: "🔴",
    hackernews: "🟠",
    twitter: "🐦",
    indiehackers: "💼",
    quora: "❓",
    producthunt: "🚀",
};

interface SparklineProps {
    data: number[];
    height?: number;
    className?: string;
    color?: string;
}

export function Sparkline({ data, height = 32, className = "", color = "#6366f1" }: SparklineProps) {
    if (data.length === 0) return null;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    // Calculate points for SVG path
    const width = 100;
    const points = data.map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 4);
        return `${x},${y}`;
    });

    const pathD = `M ${points.join(" L ")}`;

    // Calculate trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
    const trend = secondAvg > firstAvg ? "up" : secondAvg < firstAvg ? "down" : "flat";

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg width={width} height={height} className="overflow-visible">
                {/* Gradient fill under line */}
                <defs>
                    <linearGradient id={`sparkGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                    d={`${pathD} L ${width},${height} L 0,${height} Z`}
                    fill={`url(#sparkGradient-${color})`}
                />

                {/* Line */}
                <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* End dot */}
                <circle
                    cx={width}
                    cy={height - ((data[data.length - 1] - min) / range) * (height - 4)}
                    r="3"
                    fill={color}
                />
            </svg>

            {/* Trend indicator */}
            {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
            {trend === "down" && <TrendingDown className="w-4 h-4 text-rose-400" />}
            {trend === "flat" && <Minus className="w-4 h-4 text-gray-500" />}
        </div>
    );
}


interface TrendsWidgetProps {
    onViewHot?: (problemId: string) => void;
}

interface TrendData {
    total_problems: number;
    total_analyzed: number;
    avg_opportunity_score: number;
    top_categories: { category: string; count: number; avg_score: number }[];
    platform_breakdown: { platform: string; count: number }[];
    daily_trend: { date: string; count: number }[];
}

interface HotProblem {
    id: string;
    title: string;
    platform: string;
    opportunity_score: number;
    category: string;
    problem_summary: string;
}

export function TrendsWidget({ onViewHot }: TrendsWidgetProps) {
    const [loading, setLoading] = useState(true);
    const [trends, setTrends] = useState<TrendData | null>(null);
    const [hotProblems, setHotProblems] = useState<HotProblem[]>([]);
    const [sparklineData, setSparklineData] = useState<number[]>([]);

    useEffect(() => {
        fetchTrends();
    }, []);

    async function fetchTrends() {
        try {
            const [trendsRes, sparkRes, hotRes] = await Promise.all([
                fetch(`${API_BASE}/discovery/trends?days=30`),
                fetch(`${API_BASE}/discovery/trends/sparkline?days=14`),
                fetch(`${API_BASE}/discovery/trends/hot?limit=5`),
            ]);

            if (trendsRes.ok) {
                const data = await trendsRes.json();
                setTrends(data);
            }

            if (sparkRes.ok) {
                const data = await sparkRes.json();
                setSparklineData(data.sparkline || []);
            }

            if (hotRes.ok) {
                const data = await hotRes.json();
                setHotProblems(data);
            }
        } catch (e) {
            console.error("Failed to fetch trends:", e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
            </div>
        );
    }

    if (!trends) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {/* Total Problems */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs text-gray-500">30 days</span>
                    </div>
                    <div className="text-2xl font-bold text-white tabular-nums">{trends.total_problems}</div>
                    <div className="text-xs text-gray-500">Problems Found</div>
                    <div className="mt-2">
                        <Sparkline data={sparklineData} height={24} />
                    </div>
                </motion.div>

                {/* Analyzed */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="w-4 h-4 text-violet-400" />
                        <span className="text-xs text-violet-400">
                            {trends.total_problems > 0
                                ? Math.round((trends.total_analyzed / trends.total_problems) * 100)
                                : 0}%
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-white tabular-nums">{trends.total_analyzed}</div>
                    <div className="text-xs text-gray-500">AI Analyzed</div>
                    <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                            style={{
                                width: `${trends.total_problems > 0 ? (trends.total_analyzed / trends.total_problems) * 100 : 0}%`,
                            }}
                        />
                    </div>
                </motion.div>

                {/* Avg Score */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-amber-400">quality</span>
                    </div>
                    <div className="text-2xl font-bold text-white tabular-nums">
                        {trends.avg_opportunity_score}<span className="text-lg opacity-40">/10</span>
                    </div>
                    <div className="text-xs text-gray-500">Avg Opportunity</div>
                </motion.div>
            </div>

            {/* Platform & Category Breakdown */}
            <div className="grid grid-cols-2 gap-4">
                {/* Platforms */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
                >
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                        By Platform
                    </div>
                    <div className="space-y-2">
                        {trends.platform_breakdown.slice(0, 4).map((p) => (
                            <div key={p.platform} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span>{platformIcons[p.platform] || "📌"}</span>
                                    <span className="text-sm text-gray-400 capitalize">{p.platform}</span>
                                </div>
                                <span className="text-sm font-medium text-white tabular-nums">{p.count}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Categories */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
                >
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Top Categories
                    </div>
                    <div className="space-y-2">
                        {trends.top_categories.slice(0, 4).map((c) => (
                            <div key={c.category} className="flex items-center justify-between">
                                <span className="text-sm text-gray-400 capitalize truncate">{c.category}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-indigo-400">{c.avg_score}/10</span>
                                    <span className="text-sm font-medium text-white tabular-nums">{c.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Hot Problems */}
            {hotProblems.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                            Hot Opportunities (7+ Score)
                        </span>
                    </div>
                    <div className="space-y-2">
                        {hotProblems.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => onViewHot?.(p.id)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-sm">
                                    {p.opportunity_score}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white truncate group-hover:text-amber-300 transition-colors">
                                        {p.title}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{platformIcons[p.platform]}</span>
                                        <span className="capitalize">{p.category}</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-amber-400 transition-colors" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
