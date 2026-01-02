"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import {
    BarChart3,
    TrendingUp,
    Users,
    Hash,
    PieChart,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
} from "recharts";
import { api } from "@/lib/api";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

// Premium color palette
const COLORS = ["#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];

// Premium Stat Card
function PremiumStatCard({
    title,
    value,
    icon: Icon,
    color = "teal",
    delay = 0,
}: {
    title: string;
    value: string | number;
    icon: any;
    color?: "teal" | "violet" | "amber" | "emerald";
    delay?: number;
}) {
    const colorConfig = {
        teal: { bg: "bg-teal-500/10", text: "text-teal-400", glow: "from-teal-500/20" },
        violet: { bg: "bg-violet-500/10", text: "text-violet-400", glow: "from-violet-500/20" },
        amber: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "from-amber-500/20" },
        emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "from-emerald-500/20" },
    };
    const config = colorConfig[color];

    return (
        <Card className="group relative border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden bg-card/30">
            <div className={`absolute inset-0 bg-gradient-to-br ${config.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
            <CardContent className="p-5 flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${config.text}`} />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// Chart Card Container
function ChartCard({
    title,
    icon: Icon,
    children,
    delay = 0,
    className = "",
}: {
    title: string;
    icon: any;
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="h-full"
        >
            <Card className={`h-full border-white/[0.06] bg-card/30 ${className}`}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-violet-400" />
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {children}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border rounded-xl p-3 shadow-xl">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
                        {p.name}: {p.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function AnalyticsPage() {
    const [days, setDays] = useState("30");

    // Fetch overview
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ["analytics", "overview"],
        queryFn: api.analytics.overview,
    });

    // Fetch time series
    const { data: timeseries, isLoading: timeseriesLoading } = useQuery({
        queryKey: ["analytics", "timeseries", days],
        queryFn: () => api.analytics.timeseries({ days: parseInt(days) }),
    });

    // Fetch keywords
    const { data: keywords, isLoading: keywordsLoading } = useQuery({
        queryKey: ["analytics", "keywords"],
        queryFn: () => api.analytics.keywords({ limit: 20 }),
    });

    // Fetch post type distribution
    const { data: postTypes } = useQuery({
        queryKey: ["analytics", "postTypes"],
        queryFn: () => api.analytics.distributions.postTypes(),
    });

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 pb-10 -m-6">
                {/* Page Header */}
                <div className="bg-card/30 border-b border-border p-6 backdrop-blur-xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-violet-400" />
                                </div>
                                Analytics
                            </h1>
                            <p className="text-sm text-muted-foreground ml-[52px]">
                                Insights from your scraped data
                            </p>
                        </div>

                        <Tabs value={days} onValueChange={setDays}>
                            <TabsList className="bg-muted/50 border border-white/5">
                                <TabsTrigger value="7">7d</TabsTrigger>
                                <TabsTrigger value="30">30d</TabsTrigger>
                                <TabsTrigger value="90">90d</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                <div className="px-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PremiumStatCard
                            title="Total Posts"
                            value={(overview?.total_posts || 0).toLocaleString()}
                            icon={BarChart3}
                            color="teal"
                            delay={0.1}
                        />
                        <PremiumStatCard
                            title="Total Comments"
                            value={(overview?.total_comments || 0).toLocaleString()}
                            icon={TrendingUp}
                            color="violet"
                            delay={0.15}
                        />
                        <PremiumStatCard
                            title="Subreddits"
                            value={overview?.total_subreddits || 0}
                            icon={Users}
                            color="amber"
                            delay={0.2}
                        />
                        <PremiumStatCard
                            title="Avg Score"
                            value={overview?.avg_score?.toFixed(1) || "0"}
                            icon={Hash}
                            color="emerald"
                            delay={0.25}
                        />
                    </div>

                    {/* Time Series Chart */}
                    <ChartCard title="Posts Over Time" icon={TrendingUp} delay={0.3}>
                        {timeseriesLoading ? (
                            <div className="h-[300px] bg-white/[0.02] rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={timeseries || []}>
                                    <defs>
                                        <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="date" stroke="#4b5563" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="posts"
                                        name="Posts"
                                        stroke="#14b8a6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorPosts)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Post Types */}
                        <ChartCard title="Post Types" icon={PieChart} delay={0.35}>
                            <ResponsiveContainer width="100%" height={250}>
                                <RechartsPieChart>
                                    <Pie
                                        data={postTypes || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="label"
                                    >
                                        {(postTypes || []).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-3 justify-center mt-4">
                                {(postTypes || []).slice(0, 5).map((item, idx) => (
                                    <div key={item.label} className="flex items-center gap-2 text-sm">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                        />
                                        <span className="text-gray-400">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>

                        {/* Top Keywords */}
                        <ChartCard title="Top Keywords" icon={Hash} delay={0.4}>
                            {keywordsLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="h-10 bg-white/[0.02] rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {(keywords || []).slice(0, 10).map((kw, idx) => (
                                        <motion.div
                                            key={kw.keyword}
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-white/[0.04] hover:border-white/[0.08] transition-colors group"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + idx * 0.05 }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-teal-500/10 text-teal-400' : 'bg-white/[0.05] text-gray-500'
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                                    {kw.keyword}
                                                </span>
                                            </div>
                                            <span className="text-sm font-mono text-gray-500">
                                                {kw.count.toLocaleString()}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </ChartCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
