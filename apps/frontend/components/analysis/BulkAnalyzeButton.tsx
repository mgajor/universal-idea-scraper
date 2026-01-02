"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api";

interface BulkAnalysisStatus {
    job_id: string;
    status: string;
    total: number;
    completed: number;
    failed: number;
    current_problem: string | null;
    errors: string[];
}

interface BulkAnalyzeButtonProps {
    onComplete?: () => void;
    className?: string;
}

export function BulkAnalyzeButton({ onComplete, className = "" }: BulkAnalyzeButtonProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<BulkAnalysisStatus | null>(null);
    const [showPanel, setShowPanel] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Poll for status updates
    useEffect(() => {
        if (!jobId || !isRunning) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/discovery/problems/bulk-analyze/${jobId}`);
                if (res.ok) {
                    const data: BulkAnalysisStatus = await res.json();
                    setStatus(data);

                    if (data.status === "completed") {
                        setIsRunning(false);
                        clearInterval(interval);
                        onComplete?.();
                    }
                }
            } catch (e) {
                console.error("Failed to get bulk analysis status:", e);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId, isRunning, onComplete]);

    async function startBulkAnalysis() {
        setError(null);
        setIsRunning(true);
        setShowPanel(true);

        try {
            const res = await fetch(`${API_BASE}/discovery/problems/bulk-analyze?limit=50`, {
                method: "POST",
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to start bulk analysis");
            }

            const data = await res.json();

            if (!data.job_id) {
                // No problems to analyze
                setStatus({
                    job_id: "",
                    status: "completed",
                    total: 0,
                    completed: 0,
                    failed: 0,
                    current_problem: null,
                    errors: [],
                });
                setIsRunning(false);
                return;
            }

            setJobId(data.job_id);
            setStatus({
                job_id: data.job_id,
                status: "running",
                total: data.total,
                completed: 0,
                failed: 0,
                current_problem: null,
                errors: [],
            });
        } catch (e: any) {
            setError(e.message);
            setIsRunning(false);
        }
    }

    const progress = status && status.total > 0
        ? Math.round(((status.completed + status.failed) / status.total) * 100)
        : 0;

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={startBulkAnalysis}
                disabled={isRunning}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none ${className}`}
            >
                {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4" />
                )}
                {isRunning ? "Analyzing..." : "Bulk Analyze"}
            </button>

            {/* Progress Panel */}
            <AnimatePresence>
                {showPanel && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 w-80 bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                {status?.status === "completed" ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
                                )}
                                <span className="font-medium text-white">
                                    {status?.status === "completed" ? "Analysis Complete" : "Bulk AI Analysis"}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowPanel(false)}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {error ? (
                                <div className="flex items-start gap-2 text-rose-400">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            ) : status ? (
                                <>
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                                            <span>Progress</span>
                                            <span>{status.completed + status.failed} / {status.total}</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className="text-lg font-bold text-white">{status.total}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">Total</div>
                                        </div>
                                        <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                                            <div className="text-lg font-bold text-emerald-400">{status.completed}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">Done</div>
                                        </div>
                                        <div className="bg-rose-500/10 rounded-lg p-2 text-center">
                                            <div className="text-lg font-bold text-rose-400">{status.failed}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">Failed</div>
                                        </div>
                                    </div>

                                    {/* Current Problem */}
                                    {status.current_problem && status.status === "running" && (
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                            <span className="truncate">{status.current_problem}</span>
                                        </div>
                                    )}

                                    {/* Completion Message */}
                                    {status.status === "completed" && (
                                        <div className="text-sm text-emerald-400 text-center py-2">
                                            ✨ Analysis complete! Refresh to see results.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
