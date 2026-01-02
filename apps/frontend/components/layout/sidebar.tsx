"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Briefcase,
    Activity,
    Search,
    BarChart3,
    Download,
    Puzzle,
    Bell,
    Settings,
    Radar,
    Lightbulb,
    Target
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { CollectionsPanel } from "@/components/collections/CollectionsPanel";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Command Center", href: "/opportunities", icon: Target },
    { name: "Discover", href: "/discover", icon: Lightbulb },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Live Monitor", href: "/monitor", icon: Activity },
    { name: "Search", href: "/search", icon: Search },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Exports", href: "/exports", icon: Download },
    { name: "Plugins", href: "/plugins", icon: Puzzle },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-[260px] flex flex-col z-40 bg-card/50 backdrop-blur-xl border-r border-border">
            {/* Logo */}
            <div className="h-20 flex items-center px-6">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
                        <Radar className="w-5 h-5 text-white" />
                        <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                            Reddit Ops
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Console v2.0</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-1">
                <div className="px-3 mb-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Main Menu
                    </span>
                </div>

                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link key={item.name} href={item.href} className="block relative group">
                            <motion.div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative z-10",
                                    isActive
                                        ? "text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-indigo-400" : "group-hover:text-indigo-400")} />
                                <span className="font-medium text-sm">{item.name}</span>
                            </motion.div>

                            {/* Active/Hover Background */}
                            <div className={cn(
                                "absolute inset-0 rounded-lg transition-all duration-300",
                                isActive
                                    ? "bg-secondary/50 shadow-inner border border-border"
                                    : "bg-transparent group-hover:bg-muted/30"
                            )} />

                            {/* Active Glow Indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                />
                            )}
                        </Link>
                    );
                })}

                {/* Collections Panel Component */}
                <div className="mt-8 border-t border-border pt-4 px-2">
                    <CollectionsPanel compact />
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 mt-auto">
                <div className="bg-card/50 rounded-xl p-4 border border-border relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-emerald-400">System Operational</span>
                            <span className="text-[10px] text-muted-foreground">Latency: 24ms</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
