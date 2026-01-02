"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    Database,
    Globe,
    Shield,
    Save,
    Mail,
    Clock,
    Send,
    Eye,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DigestSettings {
    email: string;
    is_enabled: boolean;
    schedule_day: number;
    schedule_hour: number;
    min_opportunity_score: number;
    include_unanalyzed: boolean;
    max_problems: number;
    platforms: string[];
}

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        apiPort: 8000,
        maxConcurrentJobs: 3,
        defaultLimit: 100,
        authEnabled: false,
        authPassword: "",
        theme: "dark",
    });

    const [digestSettings, setDigestSettings] = useState<DigestSettings>({
        email: "",
        is_enabled: false,
        schedule_day: 0,
        schedule_hour: 9,
        min_opportunity_score: 6,
        include_unanalyzed: false,
        max_problems: 20,
        platforms: [],
    });

    const [digestLoading, setDigestLoading] = useState(true);
    const [digestSaving, setDigestSaving] = useState(false);
    const [digestMessage, setDigestMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        fetchDigestSettings();
    }, []);

    async function fetchDigestSettings() {
        try {
            const res = await fetch(`${API_BASE}/digest/settings`);
            if (res.ok) {
                const data = await res.json();
                setDigestSettings({
                    email: data.email || "",
                    is_enabled: data.is_enabled,
                    schedule_day: data.schedule_day,
                    schedule_hour: data.schedule_hour,
                    min_opportunity_score: data.min_opportunity_score,
                    include_unanalyzed: data.include_unanalyzed,
                    max_problems: data.max_problems,
                    platforms: data.platforms || [],
                });
            }
        } catch (e) {
            console.error("Failed to fetch digest settings:", e);
        } finally {
            setDigestLoading(false);
        }
    }

    async function saveDigestSettings() {
        setDigestSaving(true);
        setDigestMessage(null);
        try {
            const res = await fetch(`${API_BASE}/digest/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(digestSettings),
            });
            if (res.ok) {
                setDigestMessage({ type: "success", text: "Digest settings saved!" });
            } else {
                throw new Error("Failed to save");
            }
        } catch (e) {
            setDigestMessage({ type: "error", text: "Failed to save digest settings" });
        } finally {
            setDigestSaving(false);
        }
    }

    async function fetchPreview() {
        setPreviewLoading(true);
        try {
            const res = await fetch(`${API_BASE}/digest/preview?days=7`);
            if (res.ok) {
                const data = await res.json();
                setPreviewData(data);
                setShowPreview(true);
            }
        } catch (e) {
            console.error("Failed to fetch preview:", e);
        } finally {
            setPreviewLoading(false);
        }
    }

    async function sendTestDigest() {
        try {
            const res = await fetch(`${API_BASE}/digest/send-test`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setDigestMessage({ type: "success", text: data.message });
            }
        } catch (e) {
            setDigestMessage({ type: "error", text: "Failed to send test" });
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 pb-10">
                {/* Page Header */}
                <div className="border-b border-border p-6 bg-card/30 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <SettingsIcon className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
                            <p className="text-sm text-muted-foreground">
                                Configure your Market Validation Toolkit
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 space-y-6 max-w-5xl mx-auto">
                    {/* Email Digest Settings */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-teal-400" />
                            </div>
                            <div>
                                <CardTitle>Weekly Digest Email</CardTitle>
                                <CardDescription>Receive a summary of top opportunities</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {digestLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading settings...
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Enable weekly digest emails</Label>
                                            <p className="text-sm text-muted-foreground">Automatically send market reports to your inbox</p>
                                        </div>
                                        <Switch
                                            checked={digestSettings.is_enabled}
                                            onCheckedChange={(val) => setDigestSettings({ ...digestSettings, is_enabled: val })}
                                        />
                                    </div>

                                    <AnimatePresence>
                                        {digestSettings.is_enabled && (
                                            <motion.div
                                                className="space-y-6"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                <div className="grid gap-2">
                                                    <Label>Email Address</Label>
                                                    <Input
                                                        type="email"
                                                        value={digestSettings.email}
                                                        onChange={(e) => setDigestSettings({ ...digestSettings, email: e.target.value })}
                                                        placeholder="your@email.com"
                                                        className="max-w-md"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label>Day of Week</Label>
                                                        <Select
                                                            value={digestSettings.schedule_day.toString()}
                                                            onValueChange={(val) => setDigestSettings({ ...digestSettings, schedule_day: parseInt(val) })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Day" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {DAY_NAMES.map((day, i) => (
                                                                    <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Time (Hour)</Label>
                                                        <Select
                                                            value={digestSettings.schedule_hour.toString()}
                                                            onValueChange={(val) => setDigestSettings({ ...digestSettings, schedule_hour: parseInt(val) })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Time" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Array.from({ length: 24 }, (_, i) => (
                                                                    <SelectItem key={i} value={i.toString()}>
                                                                        {i.toString().padStart(2, "0")}:00
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <Separator />

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <Label>Min Opportunity Score ({digestSettings.min_opportunity_score}+)</Label>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={1}
                                                            max={10}
                                                            value={digestSettings.min_opportunity_score}
                                                            onChange={(e) =>
                                                                setDigestSettings({ ...digestSettings, min_opportunity_score: parseInt(e.target.value) })
                                                            }
                                                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Max Problems per Digest</Label>
                                                        <Input
                                                            type="number"
                                                            value={digestSettings.max_problems}
                                                            onChange={(e) => setDigestSettings({ ...digestSettings, max_problems: parseInt(e.target.value) || 20 })}
                                                            className="max-w-[200px]"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-3 pt-4">
                                                    <Button
                                                        onClick={saveDigestSettings}
                                                        disabled={digestSaving}
                                                        className="bg-teal-500 hover:bg-teal-400 text-white"
                                                    >
                                                        {digestSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                        Save Settings
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={fetchPreview}
                                                        disabled={previewLoading}
                                                    >
                                                        {previewLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                                                        Preview
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={sendTestDigest}
                                                    >
                                                        <Send className="w-4 h-4 mr-2" />
                                                        Send Test
                                                    </Button>
                                                </div>

                                                {digestMessage && (
                                                    <motion.div
                                                        className={`flex items-center gap-2 text-sm p-3 rounded-md ${digestMessage.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                    >
                                                        {digestMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                        {digestMessage.text}
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Server Settings */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <CardTitle>Server Configuration</CardTitle>
                                <CardDescription>Backend server activity settings</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>API Port</Label>
                                    <Input
                                        type="number"
                                        value={settings.apiPort}
                                        onChange={(e) => setSettings({ ...settings, apiPort: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Concurrent Jobs</Label>
                                    <Input
                                        type="number"
                                        value={settings.maxConcurrentJobs}
                                        onChange={(e) => setSettings({ ...settings, maxConcurrentJobs: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Scraper Settings */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <SettingsIcon className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <CardTitle>Scraper Defaults</CardTitle>
                                <CardDescription>Default scraping behavior configuration</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label>Default Post Limit</Label>
                                <Input
                                    type="number"
                                    value={settings.defaultLimit}
                                    onChange={(e) => setSettings({ ...settings, defaultLimit: parseInt(e.target.value) })}
                                    className="max-w-[200px]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <CardTitle>Security</CardTitle>
                                <CardDescription>Access control and authentication</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable password protection</Label>
                                    <p className="text-sm text-muted-foreground">Require a password to access the dashboard</p>
                                </div>
                                <Switch
                                    checked={settings.authEnabled}
                                    onCheckedChange={(val) => setSettings({ ...settings, authEnabled: val })}
                                />
                            </div>

                            <AnimatePresence>
                                {settings.authEnabled && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2"
                                    >
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            value={settings.authPassword}
                                            onChange={(e) => setSettings({ ...settings, authPassword: e.target.value })}
                                            placeholder="Enter password"
                                            className="max-w-[300px]"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                    {/* Database Info */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                                <Database className="w-5 h-5 text-teal-400" />
                            </div>
                            <div>
                                <CardTitle>Database Information</CardTitle>
                                <CardDescription>Storage status and configuration</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-0">
                            {[
                                { label: "Type", value: "SQLite" },
                                { label: "Location", value: "./data/reddit_ops.db", mono: true },
                                { label: "Status", value: "Connected", status: "good" },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between py-3 border-b border-border last:border-0 items-center">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className={`px-2 py-1 rounded-md text-sm ${item.mono ? 'font-mono bg-muted' : ''} ${item.status === 'good' ? 'text-emerald-400 bg-emerald-500/10' : 'text-foreground'}`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Modal */}
                <AnimatePresence>
                    {showPreview && previewData && (
                        <motion.div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPreview(false)}
                        >
                            <motion.div
                                className="bg-card w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border border-border shadow-2xl"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">Digest Preview</h3>
                                        <p className="text-sm text-muted-foreground">Last 7 days summary</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPreview(false)}
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { label: "Discovered", value: previewData.total_discovered },
                                            { label: "Analyzed", value: previewData.total_analyzed },
                                            { label: "Avg Score", value: previewData.avg_score },
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-muted/30 rounded-xl p-4 text-center border border-border">
                                                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                                                <div className="text-xs text-muted-foreground">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-medium text-foreground">Top Opportunities ({previewData.problems.length})</h4>
                                        {previewData.problems.slice(0, 5).map((p: any) => (
                                            <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border">
                                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                                                    {p.opportunity_score}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm text-foreground truncate">{p.title}</div>
                                                    <div className="text-xs text-muted-foreground">{p.platform} • {p.category}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 border-t border-border flex justify-end bg-muted/20">
                                    <Button variant="secondary" onClick={() => setShowPreview(false)}>
                                        Close
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
