import { Search, LayoutGrid, List, ChevronDown } from "lucide-react";

export type AudiencePersona = "all" | "saas" | "service" | "agency" | "hybrid";
export type TimeFrame = "24h" | "7d" | "30d" | "all";
export type ViewMode = "grid" | "list";

export function CommandHeader({
    selectedAudience,
    onAudienceChange,
    selectedTimeframe,
    onTimeframeChange,
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
}: {
    selectedAudience: AudiencePersona;
    onAudienceChange: (a: AudiencePersona) => void;
    selectedTimeframe: TimeFrame;
    onTimeframeChange: (t: TimeFrame) => void;
    viewMode: ViewMode;
    onViewModeChange: (v: ViewMode) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}) {
    return (
        <div className="bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-30 p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between max-w-7xl mx-auto">
                {/* Search */}
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-teal-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search opportunities..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#050810]/50 border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="relative">
                        <select
                            value={selectedAudience}
                            onChange={(e) => onAudienceChange(e.target.value as AudiencePersona)}
                            className="appearance-none pl-4 pr-10 py-2.5 bg-[#050810]/50 border border-white/[0.06] rounded-xl text-sm font-medium text-gray-300 focus:outline-none focus:border-teal-500/50 cursor-pointer hover:bg-white/[0.02] transition-colors"
                        >
                            <option value="all">All Audiences</option>
                            <option value="saas">SaaS Builders</option>
                            <option value="service">Service Providers</option>
                            <option value="agency">Agencies</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={selectedTimeframe}
                            onChange={(e) => onTimeframeChange(e.target.value as TimeFrame)}
                            className="appearance-none pl-4 pr-10 py-2.5 bg-[#050810]/50 border border-white/[0.06] rounded-xl text-sm font-medium text-gray-300 focus:outline-none focus:border-teal-500/50 cursor-pointer hover:bg-white/[0.02] transition-colors"
                        >
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>

                    <div className="h-8 w-px bg-white/[0.06] mx-1" />

                    <div className="flex items-center bg-[#050810]/50 rounded-xl p-1 border border-white/[0.06]">
                        <button
                            onClick={() => onViewModeChange("grid")}
                            className={`p-2 rounded-lg transition-all ${viewMode === "grid"
                                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20 scale-105"
                                : "text-gray-500 hover:text-white"
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onViewModeChange("list")}
                            className={`p-2 rounded-lg transition-all ${viewMode === "list"
                                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20 scale-105"
                                : "text-gray-500 hover:text-white"
                                }`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
