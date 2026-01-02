"use client";

import { motion } from "framer-motion";
import {
    Radar,
    Target,
    Sparkles,
    TrendingUp,
    Flame,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";

interface StatsData {
    totalOpportunities: number;
    highSignal: number;
    yourMatches: number;
    addedThisWeek: number;
    weeklyTrend: number; // percentage change
}

interface StatsBarProps {
    stats: StatsData;
    isLoading?: boolean;
}

function StatCard({
    icon: Icon,
    label,
    value,
    trend,
    iconColor,
    delay = 0,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    trend?: number;
    iconColor: string;
    delay?: number;
}) {
    return (
        <motion.div
            className="flex items-center gap-4 px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
        >
            <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white tabular-nums">
                        {typeof value === "number" ? value.toLocaleString() : value}
                    </span>
                    {trend !== undefined && trend !== 0 && (
                        <span className={`
                            flex items-center text-xs font-medium
                            ${trend > 0 ? "text-emerald-400" : "text-rose-400"}
                        `}>
                            {trend > 0 ? (
                                <ArrowUpRight className="w-3 h-3" />
                            ) : (
                                <ArrowDownRight className="w-3 h-3" />
                            )}
                            {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                <span className="text-xs text-gray-500 font-medium">
                    {label}
                </span>
            </div>
        </motion.div>
    );
}

function StatCardSkeleton() {
    return (
        <div className="flex items-center gap-4 px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
            <div className="w-10 h-10 rounded-lg bg-gray-800 animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-6 w-16 bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-800 rounded animate-pulse" />
            </div>
        </div>
    );
}

export function StatsBar({ stats, isLoading }: StatsBarProps) {
    if (isLoading) {
        return (
            <div className="px-6 py-4 border-b border-white/[0.04]">
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <StatCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="px-6 py-4 border-b border-white/[0.04] bg-[#0a0f1a]/50">
            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    icon={Radar}
                    label="Total Opportunities"
                    value={stats.totalOpportunities}
                    iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
                    delay={0}
                />
                <StatCard
                    icon={Flame}
                    label="High Signal"
                    value={stats.highSignal}
                    iconColor="bg-gradient-to-br from-orange-500 to-orange-600"
                    delay={0.05}
                />
                <StatCard
                    icon={Target}
                    label="Your Matches"
                    value={stats.yourMatches}
                    iconColor="bg-gradient-to-br from-teal-500 to-teal-600"
                    delay={0.1}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Added This Week"
                    value={`+${stats.addedThisWeek}`}
                    trend={stats.weeklyTrend}
                    iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
                    delay={0.15}
                />
            </div>
        </div>
    );
}

export default StatsBar;
