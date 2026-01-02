"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
    Search as SearchIcon,
    Filter,
    FileText,
    MessageSquare,
    ExternalLink,
    ChevronDown,
    X,
} from "lucide-react";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Search Result Card
function ResultCard({ result }: { result: any }) {
    const isPost = result.type === "post";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
        >
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex items-start gap-4">
                    <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPost ? "bg-blue-500/10" : "bg-purple-500/10"
                            }`}
                    >
                        {isPost ? (
                            <FileText className="w-5 h-5 text-blue-500" />
                        ) : (
                            <MessageSquare className="w-5 h-5 text-purple-500" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {isPost && (
                            <h3 className="font-semibold mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                {result.title}
                            </h3>
                        )}
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                            {result.highlight || result.body || result.selftext}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className="font-mono text-[10px] font-normal">
                                r/{result.subreddit}
                            </Badge>
                            <span>by u/{result.author}</span>
                            <span className="flex items-center gap-1">
                                ⬆ {result.score}
                            </span>
                            {result.created_utc && (
                                <span>{new Date(result.created_utc).toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>

                    {result.permalink && (
                        <Button variant="ghost" size="icon" asChild className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                                href={`https://reddit.com${result.permalink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Skeleton
function ResultSkeleton() {
    return (
        <Card>
            <CardContent className="p-4 flex items-start gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        type: "all",
        subreddit: "",
        minScore: "",
    });
    const [showFilters, setShowFilters] = useState(false);

    // Search query
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["search", searchQuery, filters],
        queryFn: () =>
            api.search({
                q: searchQuery,
                type: filters.type === "all" ? undefined : filters.type,
                subreddit: filters.subreddit || undefined,
                limit: 50,
            }),
        enabled: searchQuery.length > 0,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(query);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 pb-10 -m-6">
                {/* Page Header */}
                <PageHeader
                    title="Search"
                    description="Search across all scraped posts and comments"
                    icon={SearchIcon}
                />

                <div className="px-6 space-y-6 max-w-4xl mx-auto">
                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    className="pl-9 h-11 text-base bg-card/50"
                                    placeholder="Search posts, comments, keywords..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                {query && (
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                                        onClick={() => {
                                            setQuery("");
                                            setSearchQuery("");
                                        }}
                                    >
                                        <X className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant={showFilters ? "secondary" : "outline"}
                                onClick={() => setShowFilters(!showFilters)}
                                className="h-11 px-4 gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                                <ChevronDown
                                    className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""
                                        }`}
                                />
                            </Button>
                            <Button type="submit" className="h-11 px-8">
                                Search
                            </Button>
                        </div>

                        {/* Filters Panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <Card className="bg-muted/30 border-dashed">
                                        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Type</label>
                                                <Select
                                                    value={filters.type}
                                                    onValueChange={(val) => setFilters({ ...filters, type: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All Content" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Content</SelectItem>
                                                        <SelectItem value="post">Posts Only</SelectItem>
                                                        <SelectItem value="comment">Comments Only</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Subreddit</label>
                                                <Input
                                                    placeholder="e.g. artificial"
                                                    value={filters.subreddit}
                                                    onChange={(e) => setFilters({ ...filters, subreddit: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Min Score</label>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={filters.minScore}
                                                    onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    {/* Results */}
                    {isLoading || isFetching ? (
                        <div className="space-y-3">
                            <ResultSkeleton />
                            <ResultSkeleton />
                            <ResultSkeleton />
                        </div>
                    ) : searchQuery && data ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground font-medium">
                                Found {data.total} results for "{searchQuery}"
                            </p>
                            <div className="space-y-3">
                                {data.items.map((result: any, idx: number) => (
                                    <ResultCard key={`${result.type}-${result.id}-${idx}`} result={result} />
                                ))}
                            </div>
                            {data.items.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <SearchIcon className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                                    <p className="text-muted-foreground">
                                        Try adjusting your search query or filters
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border">
                            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <SearchIcon className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Search Your Data</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Enter a search query above to find posts and comments across all your
                                scraped Reddit data.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
