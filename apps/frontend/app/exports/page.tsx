"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import {
    Download,
    Plus,
    FileText,
    FileJson,
    Database,
    CheckCircle,
    Clock,
    XCircle,
    Trash2,
    Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const formatIcons: Record<string, any> = {
    csv: FileText,
    json: FileJson,
    parquet: Database,
};

export default function ExportsPage() {
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        format: "csv",
        subreddit: "",
    });

    const { data: exports, isLoading } = useQuery({
        queryKey: ["exports"],
        queryFn: api.exports.list,
        refetchInterval: 5000,
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string; format: string; filters?: any }) =>
            api.exports.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exports"] });
            setCreateOpen(false);
            setFormData({ name: "", format: "csv", subreddit: "" });
        },
    });

    const statusConfig: Record<string, { icon: any; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        completed: { icon: CheckCircle, variant: "default" }, // Using default (primary color) for success for now, or could map to success color if I had one
        pending: { icon: Clock, variant: "outline" },
        failed: { icon: XCircle, variant: "destructive" },
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 pb-10">
                {/* Header */}
                <div className="border-b border-border p-6 bg-card/30 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Exports</h1>
                            <p className="text-muted-foreground">
                                Download your data in CSV, JSON, or Parquet
                            </p>
                        </div>
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Export
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Export</DialogTitle>
                                    <DialogDescription>
                                        Select the format and optional filters for your data export.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Export Name</label>
                                        <Input
                                            placeholder="My Export"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Format</label>
                                        <Select
                                            value={formData.format}
                                            onValueChange={(val) => setFormData({ ...formData, format: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                                                <SelectItem value="json">JSON</SelectItem>
                                                <SelectItem value="parquet">Parquet (Big Data)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Subreddit Filter (Optional)</label>
                                        <Input
                                            placeholder="e.g. artificial"
                                            value={formData.subreddit}
                                            onChange={(e) => setFormData({ ...formData, subreddit: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => createMutation.mutate({
                                            name: formData.name,
                                            format: formData.format,
                                            filters: formData.subreddit ? { subreddit: formData.subreddit } : undefined,
                                        })}
                                        disabled={createMutation.isPending || !formData.name}
                                    >
                                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Create Export
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="px-6 space-y-6 max-w-5xl mx-auto">
                    <Card>
                        <CardHeader className="px-6 py-4 border-b border-border">
                            <CardTitle className="text-base">Export History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-6 space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : exports?.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground">
                                    <Download className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No exports created yet.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Format</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exports?.map((exp: any) => {
                                            const Icon = formatIcons[exp.format] || FileText;
                                            const status = statusConfig[exp.status] || statusConfig.pending;
                                            const StatusIcon = status.icon;

                                            return (
                                                <TableRow key={exp.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded bg-muted">
                                                                <Icon className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                            {exp.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="uppercase text-xs font-mono text-muted-foreground">
                                                        {exp.format}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {exp.file_size_bytes
                                                            ? `${(exp.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={status.variant} className="gap-1">
                                                            {exp.status === "pending" && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            {exp.status === "failed" && <XCircle className="w-3 h-3" />}
                                                            {exp.status === "completed" && <CheckCircle className="w-3 h-3" />}
                                                            {exp.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {exp.status === "completed" && (
                                                                <Button size="sm" variant="outline" asChild>
                                                                    <a href={api.exports.downloadUrl(exp.id)} download>
                                                                        <Download className="w-4 h-4 mr-2" />
                                                                        Download
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive/90">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
