"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Puzzle,
    Calendar,
    Settings,
    Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function PluginCard({ plugin }: { plugin: any }) {
    const queryClient = useQueryClient();

    const toggleMutation = useMutation({
        mutationFn: () =>
            api.plugins.configure(plugin.name, { enabled: !plugin.enabled }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plugins"] });
        },
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${plugin.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <Puzzle className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{plugin.name}</CardTitle>
                            <CardDescription className="text-xs font-mono">
                                v{plugin.version || "1.0.0"}
                            </CardDescription>
                        </div>
                    </div>
                    <Switch
                        checked={plugin.enabled}
                        onCheckedChange={() => toggleMutation.mutate()}
                        disabled={toggleMutation.isPending}
                    />
                </CardHeader>
                <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {plugin.description || "No description provided."}
                    </p>
                </CardContent>
                <CardFooter className="pt-0 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Puzzle className="w-3 h-3" />
                            <span>{plugin.run_count} runs</span>
                        </div>
                        {plugin.last_run && (
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(plugin.last_run).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        {plugin.settings_schema && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                <Settings className="w-3 h-3" />
                                Configure
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

export default function PluginsPage() {
    const { data: plugins, isLoading } = useQuery({
        queryKey: ["plugins"],
        queryFn: api.plugins.list,
    });

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 pb-10">
                {/* Header */}
                <div className="border-b border-border p-6 bg-card/30 backdrop-blur-xl">
                    <h1 className="text-2xl font-bold text-foreground">Plugins</h1>
                    <p className="text-muted-foreground">
                        Extend scraping capabilities with custom python scripts
                    </p>
                </div>

                <div className="px-6 space-y-6 max-w-5xl mx-auto">
                    {/* Plugins Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Card key={i}>
                                    <CardHeader className="flex flex-row items-center gap-4">
                                        <Skeleton className="w-10 h-10 rounded-lg" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-10 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : plugins?.length === 0 ? (
                        <Card className="p-12 text-center border-dashed">
                            <Puzzle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No Plugins Found</h3>
                            <p className="text-muted-foreground mb-4">
                                Add python scripts to the <code>plugins/</code> directory in the backend.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plugins?.map((plugin: any) => (
                                <PluginCard key={plugin.name} plugin={plugin} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
