"use client";

import { useState, useEffect } from "react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { motion } from "framer-motion";
import {
    TrendingUp,
    Flame,
    Target,
    BarChart3,
    PieChart as PieChartIcon,
    Loader2,
    Sparkles,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

const PLATFORM_COLORS: Record<string, string> = {
    reddit: "#FF4500",
    hackernews: "#FF6600",
    producthunt: "#DA552F",
    indiehackers: "#0D6EFD",
    quora: "#B92B27",
    twitter: "#1DA1F2",
};

const SCORE_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6"
];

interface DashboardData {
    overview: {
        total_problems: number;
        total_analyzed: number;
        total_saved: number;
        total_high_potential: number;
        avg_score: number;
        problems_today: number;
        problems_this_week: number;
    };
    time_series: { date: string; count: number; analyzed: number; avg_score: number }[];
    platform_stats: { platform: string; total: number; analyzed: number; avg_score: number; high_potential: number }[];
    category_stats: { category: string; count: number; avg_score: number }[];
    score_distribution: { score: number; count: number }[];
    recent_high_value: { id: string; title: string; platform: string; score: number; category: string }[];
}

export function DiscoveryAnalytics() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const res = await fetch(`${API_BASE}/analytics/dashboard?days=30`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch analytics:", e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20 text-gray-500">
                <p>No analytics data available</p>
                <Link href="/discover" className="text-indigo-400 hover:underline mt-2 inline-block">
                    Start discovering problems →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        Problem Discovery Analytics
                    </h2>
                    <p className="text-sm text-gray-500">Last 30 days performance</p>
                </div>
                <Link
                    href="/discover"
                    className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                >
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Discovered", value: data.overview.total_problems, icon: Target, color: "indigo" },
                    { label: "AI Analyzed", value: data.overview.total_analyzed, icon: Sparkles, color: "violet" },
                    { label: "High Potential (7+)", value: data.overview.total_high_potential, icon: Flame, color: "amber" },
                    { label: "Avg Score", value: data.overview.avg_score.toFixed(1), icon: TrendingUp, color: "emerald" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                            <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Time Series Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-400" />
                        Discovery Volume
                    </h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.time_series.slice(-14)}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorAnalyzed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    tick={{ fill: "#64748b", fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: "#64748b", fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "#1e293b",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "8px",
                                    }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#818cf8"
                                    strokeWidth={2}
                                    fill="url(#colorCount)"
                                    name="Discovered"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="analyzed"
                                    stroke="#a78bfa"
                                    strokeWidth={2}
                                    fill="url(#colorAnalyzed)"
                                    name="Analyzed"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Score Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-violet-400" />
                        Score Distribution
                    </h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.score_distribution} layout="horizontal">
                                <XAxis
                                    dataKey="score"
                                    tick={{ fill: "#64748b", fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: "#64748b", fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "#1e293b",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="count" name="Problems" radius={[4, 4, 0, 0]}>
                                    {data.score_distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={SCORE_COLORS[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Platform Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                        By Platform
                    </h3>
                    <div className="space-y-3">
                        {data.platform_stats.slice(0, 5).map((p) => (
                            <div key={p.platform} className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ background: PLATFORM_COLORS[p.platform] || "#718096" }}
                                />
                                <span className="text-sm text-gray-400 capitalize flex-1">{p.platform}</span>
                                <span className="text-sm font-bold text-white">{p.total}</span>
                                <span className="text-xs text-gray-500">({p.avg_score}/10)</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Top Categories */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                        Top Categories
                    </h3>
                    <div className="space-y-3">
                        {data.category_stats.slice(0, 5).map((c, i) => (
                            <div key={c.category} className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">
                                    {i + 1}
                                </span>
                                <span className="text-sm text-gray-400 capitalize flex-1 truncate">{c.category}</span>
                                <span className="text-sm font-bold text-white">{c.count}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Recent High Value */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        Hot Opportunities
                    </h3>
                    <div className="space-y-2">
                        {data.recent_high_value.slice(0, 4).map((p) => (
                            <Link
                                key={p.id}
                                href="/discover"
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">
                                    {p.score}
                                </span>
                                <span className="text-sm text-gray-300 truncate flex-1 group-hover:text-white transition-colors">
                                    {p.title.slice(0, 35)}...
                                </span>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
