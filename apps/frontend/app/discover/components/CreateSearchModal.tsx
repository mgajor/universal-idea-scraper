"use client";

import { useState, useEffect } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface Platform {
    id: string;
    name: string;
    icon: string;
}

interface CreateSearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    platforms: Platform[];
    defaultKeywords: string[];
    onSubmit: (data: {
        name: string;
        keywords: string[];
        platforms: string[];
        max_results: number;
        time_filter: string;
    }) => Promise<void>;
    isCreating?: boolean;
}

export function CreateSearchModal({
    open,
    onOpenChange,
    platforms,
    defaultKeywords,
    onSubmit,
    isCreating = false,
}: CreateSearchModalProps) {
    const [newJobName, setNewJobName] = useState("");
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["reddit", "hackernews", "producthunt"]);

    // Initialize selected keywords when modal opens
    useEffect(() => {
        if (open && defaultKeywords.length > 0 && selectedKeywords.length === 0) {
            setSelectedKeywords(defaultKeywords.slice(0, 5));
        }
    }, [open, defaultKeywords, selectedKeywords.length]);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setNewJobName("");
        }
    }, [open]);

    async function handleSubmit() {
        if (!newJobName.trim()) return;
        await onSubmit({
            name: newJobName,
            keywords: selectedKeywords,
            platforms: selectedPlatforms,
            max_results: 50,
            time_filter: "m",
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0f172a] border-white/10 text-white max-w-lg p-0 overflow-hidden sm:rounded-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="p-8 pb-0">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-light">
                            Initialize <span className="font-semibold text-indigo-400">Search Agent</span>
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Deploy a new autonomous scraper
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 pt-6 space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Operation Name
                        </Label>
                        <Input
                            value={newJobName}
                            onChange={(e) => setNewJobName(e.target.value)}
                            placeholder="e.g., Vertical SaaS Opportunities 2026"
                            className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500"
                        />
                    </div>

                    {/* Platforms */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Target Sources
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                            {platforms.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() =>
                                        setSelectedPlatforms((prev) =>
                                            prev.includes(p.id)
                                                ? prev.filter((x) => x !== p.id)
                                                : [...prev, p.id]
                                        )
                                    }
                                    className={`p-3 rounded-xl text-sm flex flex-col items-center gap-2 transition-all duration-300 border ${selectedPlatforms.includes(p.id)
                                            ? "bg-indigo-500/20 border-indigo-500 text-white"
                                            : "bg-white/[0.02] border-white/[0.05] text-muted-foreground hover:bg-white/[0.05] hover:border-white/[0.1]"
                                        }`}
                                >
                                    <span className="text-xl">{p.icon}</span>
                                    <span className="font-medium">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Keywords */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Signal Keywords
                            </Label>
                            <span className="text-xs text-indigo-400">{selectedKeywords.length} selected</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-3 border border-white/5 custom-scrollbar">
                            {defaultKeywords.map((kw) => (
                                <label
                                    key={kw}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors"
                                >
                                    <Checkbox
                                        checked={selectedKeywords.includes(kw)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setSelectedKeywords([...selectedKeywords, kw]);
                                            else setSelectedKeywords(selectedKeywords.filter((k) => k !== kw));
                                        }}
                                        className="border-gray-600 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                    />
                                    <span className={`text-sm ${selectedKeywords.includes(kw) ? "text-white" : "text-gray-400"}`}>
                                        "{kw}"
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 gap-2 sm:justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!newJobName.trim() || selectedPlatforms.length === 0 || isCreating}
                        className="bg-gradient-to-r from-teal-500 to-violet-600 text-white border-0 hover:scale-[1.02] transition-transform"
                    >
                        {isCreating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4 mr-2 fill-current" />
                        )}
                        Deploy Agent
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
