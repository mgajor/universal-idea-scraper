"use client";

import { motion } from "framer-motion";
import {
    Shield,
    AlertTriangle,
    TrendingUp,
    Target,
    ChevronRight,
    ExternalLink,
    Zap,
} from "lucide-react";

interface Competitor {
    name: string;
    weakness?: string;
    pricing?: string;
    url?: string;
}

interface CompetitiveMoatProps {
    competitors: Competitor[];
    marketGaps: string[];
    improvementOpportunities: string[];
    yourAngle?: string;
}

// Moat strength indicator
function MoatStrength({ competitors, gaps }: { competitors: number; gaps: number }) {
    // Calculate moat strength: more gaps + fewer competitors = stronger moat
    let strength: "strong" | "medium" | "weak" = "medium";
    let score = 50;

    if (competitors <= 2 && gaps >= 2) {
        strength = "strong";
        score = 85;
    } else if (competitors >= 5 || gaps === 0) {
        strength = "weak";
        score = 25;
    } else if (competitors <= 3 && gaps >= 1) {
        strength = "medium";
        score = 60;
    }

    const config = {
        strong: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Strong Moat" },
        medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Moderate Moat" },
        weak: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "Weak Moat" },
    };

    const { color, bg, border, label } = config[strength];

    return (
        <div className={`flex items-center justify-between p-3 rounded-xl ${bg} border ${border}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Shield className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                    <span className={`text-sm font-semibold ${color}`}>{label}</span>
                    <p className="text-xs text-gray-500">
                        {competitors} competitors • {gaps} market gaps
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${strength === "strong" ? "bg-emerald-500" : strength === "weak" ? "bg-red-500" : "bg-amber-500"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
                <span className={`text-xs font-bold ${color}`}>{score}%</span>
            </div>
        </div>
    );
}

// Competitor card
function CompetitorCard({ competitor, index }: { competitor: Competitor; index: number }) {
    return (
        <motion.div
            className="group relative bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{competitor.name}</span>
                        {competitor.url && (
                            <a
                                href={competitor.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-teal-400 transition-colors"
                            >
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                    {competitor.weakness && (
                        <p className="text-xs text-gray-500 flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                            <span>Weakness: {competitor.weakness}</span>
                        </p>
                    )}
                    {competitor.pricing && (
                        <p className="text-xs text-gray-600 mt-1">
                            💰 {competitor.pricing}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Market gap badge
function GapBadge({ gap, index }: { gap: string; index: number }) {
    return (
        <motion.div
            className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 rounded-lg border border-teal-500/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
        >
            <Target className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-xs text-teal-400">{gap}</span>
        </motion.div>
    );
}

// Improvement opportunity card
function ImprovementCard({ improvement, index }: { improvement: string; index: number }) {
    return (
        <motion.div
            className="flex items-start gap-2 text-xs text-gray-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Zap className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
            <span>{improvement}</span>
        </motion.div>
    );
}

export function CompetitiveMoat({
    competitors,
    marketGaps,
    improvementOpportunities,
    yourAngle,
}: CompetitiveMoatProps) {
    return (
        <div className="space-y-6">
            {/* Moat Strength Indicator */}
            <MoatStrength competitors={competitors.length} gaps={marketGaps.length} />

            {/* Your Angle (if provided) */}
            {yourAngle && (
                <div className="p-4 bg-gradient-to-r from-teal-500/10 to-violet-500/10 rounded-xl border border-teal-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-teal-400" />
                        <span className="text-sm font-semibold text-white">Your Angle</span>
                    </div>
                    <p className="text-sm text-gray-300">{yourAngle}</p>
                </div>
            )}

            {/* Market Gaps */}
            {marketGaps.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-teal-400" />
                        Market Gaps ({marketGaps.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {marketGaps.map((gap, i) => (
                            <GapBadge key={i} gap={gap} index={i} />
                        ))}
                    </div>
                </div>
            )}

            {/* Existing Competitors */}
            {competitors.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Existing Players ({competitors.length})
                    </h4>
                    <div className="space-y-2">
                        {competitors.slice(0, 5).map((comp, i) => (
                            <CompetitorCard key={i} competitor={comp} index={i} />
                        ))}
                        {competitors.length > 5 && (
                            <p className="text-xs text-gray-600 pl-4">
                                +{competitors.length - 5} more competitors
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Improvement Opportunities */}
            {improvementOpportunities.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-violet-400" />
                        How You Could Win
                    </h4>
                    <div className="space-y-2 pl-1">
                        {improvementOpportunities.map((imp, i) => (
                            <ImprovementCard key={i} improvement={imp} index={i} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CompetitiveMoat;
