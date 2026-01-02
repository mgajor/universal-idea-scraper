"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import {
    Activity,
    Play,
    Pause,
    Square,
    Terminal,
    Clock,
    Zap,
    FileText,
    MessageSquare,
    Image as ImageIcon,
} from "lucide-react";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
}

interface RunningJob {
    runId: string;
    jobName: string;
    target: string;
    progress: number;
    postsScraped: number;
    commentsScraped: number;
    itemsPerMinute: number;
    eta: number;
    logs: LogEntry[];
    status: string;
}

// Log Line Component
function LogLine({ log }: { log: LogEntry }) {
    const levelColors: Record<string, string> = {
        INFO: "text-blue-400",
        WARN: "text-yellow-400",
        ERROR: "text-red-400",
        DEBUG: "text-muted-foreground",
    };

    return (
        <div className="flex items-start gap-2 font-mono text-xs py-0.5">
            <span className="text-muted-foreground shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={`shrink-0 ${levelColors[log.level] || "text-foreground"}`}>
                [{log.level}]
            </span>
            <span className="text-foreground break-all">{log.message}</span>
        </div>
    );
}

// Running Job Card
function RunningJobCard({ job }: { job: RunningJob }) {
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [job.logs]);

    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <CardTitle className="text-base font-semibold">{job.jobName}</CardTitle>
                        <CardDescription>r/{job.target}</CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-yellow-500/10 hover:text-yellow-500">
                        <Pause className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500">
                        <Square className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Progress Section */}
                <div className="p-4 border-b border-border bg-card/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{job.progress}% Complete</span>
                        <Badge variant="outline" className="font-mono text-xs font-normal">
                            ETA: {job.eta > 0 ? `${Math.ceil(job.eta / 60)}m` : "Calculating..."}
                        </Badge>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 divide-x divide-border border-b border-border bg-card">
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <FileText className="w-3 h-3" />
                            <span className="text-xs">Posts</span>
                        </div>
                        <span className="font-semibold text-lg">{job.postsScraped}</span>
                    </div>
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <MessageSquare className="w-3 h-3" />
                            <span className="text-xs">Comments</span>
                        </div>
                        <span className="font-semibold text-lg">{job.commentsScraped}</span>
                    </div>
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Zap className="w-3 h-3" />
                            <span className="text-xs">Speed</span>
                        </div>
                        <span className="font-semibold text-lg">{job.itemsPerMinute.toFixed(0)}/m</span>
                    </div>
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">Status</span>
                        </div>
                        <span className="font-semibold text-lg text-blue-400 capitalize">{job.status}</span>
                    </div>
                </div>

                {/* Logs Terminal */}
                <div className="bg-black/80 font-mono text-sm p-0">
                    <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 text-xs text-muted-foreground bg-white/5">
                        <Terminal className="w-3 h-3" />
                        <span>Console Output</span>
                    </div>
                    <ScrollArea className="h-48 w-full">
                        <div className="p-4 space-y-1 min-h-full">
                            {job.logs.length === 0 ? (
                                <p className="text-muted-foreground text-xs italic">
                                    Waiting for output stream...
                                </p>
                            ) : (
                                job.logs.map((log, idx) => <LogLine key={idx} log={log} />)
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}

// Empty State
function EmptyState() {
    return (
        <Card className="p-12 text-center border-dashed">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
                <Terminal className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Active Jobs</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                There are no jobs currently running. Start a scraping job from the Jobs
                page to see live progress here.
            </p>
            <Button asChild>
                <a href="/jobs">
                    <Play className="w-4 h-4 mr-2" />
                    Go to Jobs
                </a>
            </Button>
        </Card>
    );
}

// Main Monitor Page
export default function MonitorPage() {
    // Fetch running jobs
    const { data: runs } = useQuery({
        queryKey: ["runs", "running"],
        queryFn: () => api.runs.list({ status: "running", limit: 10 }),
        refetchInterval: 5000,
    });

    // Fetch jobs for names
    const { data: jobs } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.jobs.list(),
    });

    // Derive running jobs from runs and jobs data (useMemo instead of useEffect+useState)
    const runningJobs = useMemo((): RunningJob[] => {
        if (!runs || !jobs) return [];
        return runs.map((run) => {
            const job = jobs.find((j) => j.id === run.job_id);
            return {
                runId: run.id,
                jobName: job?.name || "Unknown Job",
                target: job?.target || "",
                progress: run.progress_percent,
                postsScraped: run.posts_scraped,
                commentsScraped: run.comments_scraped,
                itemsPerMinute: run.items_per_minute || 0,
                eta: run.eta_seconds || 0,
                logs: [], // Logs would typically come via WS, simpler here
                status: run.status,
            };
        });
    }, [runs, jobs]);

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 pb-10 -m-6">
                {/* Page Header */}
                <PageHeader
                    title="Live Monitor"
                    description="Real-time progress and logs for running tasks"
                    icon={Activity}
                    actions={
                        runningJobs.length > 0 && (
                            <Badge variant="secondary" className="px-4 py-1.5 h-auto text-sm gap-2">
                                <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                                {runningJobs.length} Active Tasks
                            </Badge>
                        )
                    }
                />

                <div className="px-6 space-y-6 max-w-5xl mx-auto">
                    {/* Running Jobs */}
                    {runningJobs.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="space-y-6">
                            {runningJobs.map((job) => (
                                <RunningJobCard key={job.runId} job={job} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
