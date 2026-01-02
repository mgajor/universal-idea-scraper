"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Plus,
    Play,
    Copy,
    Trash2,
    MoreVertical,
    CheckCircle,
    XCircle,
    Clock,
    Activity,
    ChevronRight,
    Filter,
    Search,
    Briefcase,
} from "lucide-react";
import Link from "next/link";
import { api, Job } from "@/lib/api";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Platform configurations with supported features
const PLATFORMS = [
    { id: "reddit", name: "Reddit", icon: "🔴", targetLabel: "Subreddit", targetPlaceholder: "programming", hasMedia: true, hasComments: true, hasUserMode: true },
    { id: "hackernews", name: "Hacker News", icon: "🟠", targetLabel: "Search Term", targetPlaceholder: "AI tools", hasMedia: false, hasComments: true, hasUserMode: false },
    { id: "twitter", name: "X / Twitter", icon: "🐦", targetLabel: "Search Query", targetPlaceholder: "indie hacker problems", hasMedia: true, hasComments: false, hasUserMode: true },
    { id: "producthunt", name: "Product Hunt", icon: "🚀", targetLabel: "Topic/Product", targetPlaceholder: "AI assistant", hasMedia: true, hasComments: true, hasUserMode: false },
    { id: "quora", name: "Quora", icon: "❓", targetLabel: "Topic", targetPlaceholder: "software tools", hasMedia: false, hasComments: true, hasUserMode: false },
    { id: "indiehackers", name: "Indie Hackers", icon: "💼", targetLabel: "Search Term", targetPlaceholder: "revenue problem", hasMedia: false, hasComments: true, hasUserMode: false },
    { id: "g2", name: "G2 Reviews", icon: "⭐", targetLabel: "Product Name", targetPlaceholder: "Slack alternatives", hasMedia: false, hasComments: false, hasUserMode: false },
    { id: "capterra", name: "Capterra", icon: "📊", targetLabel: "Software Category", targetPlaceholder: "project management", hasMedia: false, hasComments: false, hasUserMode: false },
];

// Premium Status Badge
function StatusBadge({ status }: { status: string | null }) {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning", icon: any }> = {
        completed: { variant: "success", icon: CheckCircle },
        failed: { variant: "destructive", icon: XCircle },
        running: { variant: "default", icon: Activity },
        pending: { variant: "outline", icon: Clock },
    };

    const { variant, icon: Icon } = config[status || ""] || {
        variant: "secondary",
        icon: Clock,
    };

    return (
        <Badge variant={variant} className="gap-1.5 px-2.5 py-1">
            <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-pulse' : ''}`} />
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Idle"}
        </Badge>
    );
}

// Premium Job Card
function JobCard({ job, onRun, onDelete }: {
    job: Job;
    onRun: () => void;
    onDelete: () => void;
}) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            layout
        >
            <Card className="group border-border transition-all bg-card hover:shadow-md">
                <CardContent className="p-5 flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${job.last_run_status === "completed" ? "bg-emerald-500/10" :
                        job.last_run_status === "failed" ? "bg-destructive/10" :
                            job.last_run_status === "running" ? "bg-primary/10" :
                                "bg-muted"
                        }`}>
                        {job.last_run_status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : job.last_run_status === "failed" ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                        ) : job.last_run_status === "running" ? (
                            <Activity className="w-5 h-5 text-primary animate-pulse" />
                        ) : (
                            <Clock className="w-5 h-5 text-muted-foreground" />
                        )}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {job.name}
                            </h3>
                            {!job.enabled && (
                                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                                    Disabled
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            <span className="text-foreground/80">{job.is_user ? "u/" : "r/"}{job.target}</span>
                            {" "}• {job.mode} mode • {job.limit} posts
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {job.total_runs} runs
                            </span>
                            {job.schedule && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Scheduled
                                </span>
                            )}
                            {job.download_media && <span>🖼️ Media</span>}
                            {job.scrape_comments && <span>💬 Comments</span>}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <StatusBadge status={job.last_run_status} />

                        <Button
                            size="sm"
                            className="h-8 text-xs font-medium gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRun();
                            }}
                            disabled={job.last_run_status === "running"}
                        >
                            <Play className="w-3.5 h-3.5" />
                            Run
                        </Button>

                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                            >
                                <MoreVertical className="w-4 h-4" />
                            </Button>

                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-xl py-1 z-20 shadow-xl"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Link
                                            href={`/jobs/${job.id}`}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                            View Details
                                        </Link>
                                        <button
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full text-left"
                                            onClick={() => {
                                                toast.success("Job cloned successfully");
                                                setShowMenu(false);
                                            }}
                                        >
                                            <Copy className="w-4 h-4" />
                                            Clone Job
                                        </button>
                                        <button
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                                            onClick={() => {
                                                onDelete();
                                                setShowMenu(false);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Premium Skeleton
function JobCardSkeleton() {
    return (
        <Card className="border-border bg-card">
            <CardContent className="p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1">
                    <div className="h-5 w-48 bg-muted rounded-lg animate-pulse mb-2" />
                    <div className="h-4 w-64 bg-muted rounded-lg animate-pulse mb-2" />
                    <div className="h-3 w-32 bg-muted rounded-lg animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-muted rounded-xl animate-pulse" />
            </CardContent>
        </Card>
    );
}

// Premium Create Modal with Advanced Options
function CreateJobModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState("reddit");
    const [formData, setFormData] = useState({
        name: "",
        target: "",
        is_user: false,
        mode: "full",
        limit: 100,
        download_media: true,
        scrape_comments: true,
        use_plugins: false,
        dedupe: true,
        schedule: "",
    });

    const platform = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => api.jobs.create({
            ...data,
            schedule: data.schedule || undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            onClose();
            toast.success("Job created successfully", {
                description: `${formData.name} has been added to the queue.`
            });
            setFormData({
                name: "",
                target: "",
                is_user: false,
                mode: "full",
                limit: 100,
                download_media: true,
                scrape_comments: true,
                use_plugins: false,
                dedupe: true,
                schedule: "",
            });
            setShowAdvanced(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-lg bg-card border-border sm:rounded-2xl">
                <DialogHeader className="border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>Create New Job</DialogTitle>
                            <p className="text-xs text-muted-foreground mt-1">Configure a new scraping job</p>
                        </div>
                    </div>
                </DialogHeader>

                <form
                    className="space-y-5 overflow-y-auto max-h-[70vh] py-2 px-1"
                    onSubmit={(e) => {
                        e.preventDefault();
                        createMutation.mutate(formData);
                    }}
                >
                    {/* Platform Selector */}
                    <div>
                        <Label className="text-muted-foreground mb-3 block">Platform</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {PLATFORMS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedPlatform(p.id);
                                        // Reset platform-specific options
                                        setFormData({
                                            ...formData,
                                            download_media: p.hasMedia,
                                            scrape_comments: p.hasComments,
                                            is_user: false,
                                        });
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all border ${selectedPlatform === p.id
                                        ? "bg-primary/10 border-primary/40 text-foreground"
                                        : "bg-muted/30 border-border text-muted-foreground hover:border-primary/20"
                                        }`}
                                >
                                    <span className="text-lg">{p.icon}</span>
                                    <span className="text-[10px] font-medium truncate w-full text-center">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="text-muted-foreground mb-2 block">Job Name</Label>
                        <Input
                            type="text"
                            placeholder={`${platform.name} Scraping Job`}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="bg-muted/30"
                        />
                    </div>

                    <div>
                        <Label className="text-muted-foreground mb-2 block">{platform.targetLabel}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                className="flex-1 bg-muted/30"
                                placeholder={platform.hasUserMode && formData.is_user ? "username" : platform.targetPlaceholder}
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                required
                            />
                            {platform.hasUserMode && (
                                <Button
                                    type="button"
                                    variant={formData.is_user ? "default" : "outline"}
                                    onClick={() => setFormData({ ...formData, is_user: !formData.is_user })}
                                >
                                    {formData.is_user ? "User" : platform.targetLabel}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground mb-2 block">Mode</Label>
                            <Select
                                value={formData.mode}
                                onValueChange={(val) => setFormData({ ...formData, mode: val })}
                            >
                                <SelectTrigger className="bg-muted/30">
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full">Full Scrape</SelectItem>
                                    <SelectItem value="history">History Only</SelectItem>
                                    <SelectItem value="monitor">Live Monitor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-muted-foreground mb-2 block">Result Limit</Label>
                            <Input
                                type="number"
                                className="bg-muted/30"
                                min={10}
                                max={10000}
                                value={formData.limit || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, limit: val === "" ? 0 : parseInt(val) || 100 });
                                }}
                            />
                        </div>
                    </div>

                    {/* Platform-Specific Options */}
                    <div className="flex gap-4 flex-wrap">
                        {platform.hasMedia && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="download_media"
                                    checked={formData.download_media}
                                    onCheckedChange={(c) => setFormData({ ...formData, download_media: !!c })}
                                />
                                <Label htmlFor="download_media" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Download Media
                                </Label>
                            </div>
                        )}
                        {platform.hasComments && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="scrape_comments"
                                    checked={formData.scrape_comments}
                                    onCheckedChange={(c) => setFormData({ ...formData, scrape_comments: !!c })}
                                />
                                <Label htmlFor="scrape_comments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Scrape Comments
                                </Label>
                            </div>
                        )}
                        {!platform.hasMedia && !platform.hasComments && (
                            <p className="text-xs text-muted-foreground italic">
                                {platform.name} supports text content scraping only
                            </p>
                        )}
                    </div>

                    {/* Advanced Options Toggle */}
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between p-3 h-auto"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Advanced Options</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                    </Button>

                    {/* Advanced Options Panel */}
                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4 overflow-hidden"
                            >
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="use_plugins"
                                            checked={formData.use_plugins}
                                            onCheckedChange={(c) => setFormData({ ...formData, use_plugins: !!c })}
                                        />
                                        <Label htmlFor="use_plugins">Use Plugins</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="dedupe"
                                            checked={formData.dedupe}
                                            onCheckedChange={(c) => setFormData({ ...formData, dedupe: !!c })}
                                        />
                                        <Label htmlFor="dedupe">Deduplicate</Label>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-muted-foreground mb-2 block">
                                        Schedule (Cron Expression)
                                    </Label>
                                    <Input
                                        type="text"
                                        className="bg-muted/30"
                                        placeholder="0 9 * * 1 (Every Monday at 9am)"
                                        value={formData.schedule}
                                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        Leave empty for manual runs only
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? "Creating..." : "Create Job"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Main Jobs Page Content
function JobsPageContent() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");

    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setCreateModalOpen(true);
            router.replace('/jobs', { scroll: false });
        }
    }, [searchParams, router]);

    const { data: jobs, isLoading } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.jobs.list({ limit: 100 }),
    });

    const runMutation = useMutation({
        mutationFn: (jobId: string) => api.jobs.run(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            toast.success("Job started");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (jobId: string) => api.jobs.delete(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            toast.success("Job deleted");
        },
    });

    const filteredJobs = jobs?.filter((job) => {
        const matchesSearch =
            job.name.toLowerCase().includes(search.toLowerCase()) ||
            job.target.toLowerCase().includes(search.toLowerCase());
        const matchesFilter =
            filter === "all" ||
            (filter === "enabled" && job.enabled) ||
            (filter === "disabled" && !job.enabled);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="space-y-6 pb-10 -m-6">
                {/* Page Header */}
                {/* Page Header */}
                <PageHeader
                    title="Jobs"
                    description="Manage your scraping jobs"
                    icon={Briefcase}
                    actions={
                        <Button
                            onClick={() => setCreateModalOpen(true)}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Job
                        </Button>
                    }
                />

                <div className="px-6 space-y-6">
                    {/* Filters */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                className="pl-9 bg-muted/30"
                                placeholder="Search jobs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border">
                            {(["all", "enabled", "disabled"] as const).map((f) => (
                                <Button
                                    key={f}
                                    variant={filter === f ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setFilter(f)}
                                    className="h-8"
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Jobs List */}
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                <>
                                    <JobCardSkeleton />
                                    <JobCardSkeleton />
                                    <JobCardSkeleton />
                                </>
                            ) : filteredJobs?.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <Card className="border-border bg-card p-12 text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                                            <Briefcase className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground mb-2">No jobs found</h3>
                                        <p className="text-muted-foreground mb-4">
                                            {search
                                                ? "Try adjusting your search"
                                                : "Create your first scraping job to get started"}
                                        </p>
                                        {!search && (
                                            <Button
                                                onClick={() => setCreateModalOpen(true)}
                                                className="gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Create Job
                                            </Button>
                                        )}
                                    </Card>
                                </motion.div>
                            ) : (
                                filteredJobs?.map((job) => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onRun={() => runMutation.mutate(job.id)}
                                        onDelete={() => deleteMutation.mutate(job.id)}
                                    />
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Create Modal */}
                <CreateJobModal
                    open={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                />
            </div>
        </div>
    );
}

// Default Export with Suspense
export default function JobsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background">
                <div className="space-y-6 pb-10 -m-6">
                    <div className="bg-card border-b border-border p-6">
                        <div className="h-8 w-32 bg-muted/50 rounded-lg animate-pulse mb-2" />
                        <div className="h-4 w-48 bg-muted/50 rounded animate-pulse" />
                    </div>
                    <div className="px-6 space-y-3">
                        <JobCardSkeleton />
                        <JobCardSkeleton />
                        <JobCardSkeleton />
                    </div>
                </div>
            </div>
        }>
            <JobsPageContent />
        </Suspense>
    );
}
