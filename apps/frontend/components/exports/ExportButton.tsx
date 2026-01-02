"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, FileText, ChevronDown, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api";

interface ExportButtonProps {
    platform?: string;
    onlySaved?: boolean;
    className?: string;
}

export function ExportButton({ platform = "", onlySaved = false, className = "" }: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    async function handleExport(format: "csv" | "json") {
        setLoading(format);
        try {
            const res = await fetch(`${API_BASE}/exports/discovery/export`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    format,
                    platform: platform || null,
                    only_saved: onlySaved,
                    min_score: null,
                    only_analyzed: false,
                    include_insights: true,
                }),
            });

            if (res.ok) {
                // Get blob and trigger download
                const blob = await res.blob();
                const contentDisposition = res.headers.get("content-disposition");
                const filenameMatch = contentDisposition?.match(/filename=(.+)/);
                const filename = filenameMatch ? filenameMatch[1] : `problems_export.${format}`;

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (e) {
            console.error("Export failed:", e);
        } finally {
            setLoading(null);
            setIsOpen(false);
        }
    }

    function handleViewReport() {
        const params = new URLSearchParams({ days: "7" });
        window.open(`${API_BASE}/exports/discovery/report?${params}`, "_blank");
        setIsOpen(false);
    }

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors text-sm font-medium"
            >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 z-50 w-56 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-xl overflow-hidden"
                        >
                            <div className="p-2">
                                <button
                                    onClick={() => handleExport("csv")}
                                    disabled={loading !== null}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                                >
                                    {loading === "csv" ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                    ) : (
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                    )}
                                    <div>
                                        <div className="text-sm text-white font-medium">Export CSV</div>
                                        <div className="text-xs text-gray-500">Spreadsheet format</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleExport("json")}
                                    disabled={loading !== null}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                                >
                                    {loading === "json" ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                    ) : (
                                        <FileJson className="w-4 h-4 text-amber-400" />
                                    )}
                                    <div>
                                        <div className="text-sm text-white font-medium">Export JSON</div>
                                        <div className="text-xs text-gray-500">Developer format</div>
                                    </div>
                                </button>

                                <div className="border-t border-white/5 my-2" />

                                <button
                                    onClick={handleViewReport}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                                >
                                    <FileText className="w-4 h-4 text-indigo-400" />
                                    <div>
                                        <div className="text-sm text-white font-medium">View Report</div>
                                        <div className="text-xs text-gray-500">HTML summary (7 days)</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        window.open(`${API_BASE}/exports/discovery/pdf?days=7`, "_blank");
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                                >
                                    <Download className="w-4 h-4 text-rose-400" />
                                    <div>
                                        <div className="text-sm text-white font-medium">Download PDF</div>
                                        <div className="text-xs text-gray-500">Print-ready report</div>
                                    </div>
                                </button>
                            </div>

                            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5">
                                <p className="text-[10px] text-gray-500">
                                    {platform ? `Platform: ${platform}` : "All platforms"}
                                    {onlySaved ? " • Saved only" : ""}
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
