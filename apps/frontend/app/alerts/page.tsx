"use client";

import { useState } from "react";
import { Bell, Plus, Trash2, Webhook, Mail, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Mock data
const MOCK_ALERTS = [
    {
        id: "1",
        name: "High Value Lead",
        channel: "Discord",
        trigger: "Opportunity Score > 8",
        status: "active",
        last_fired: "2 mins ago",
    },
    {
        id: "2",
        name: "Weekly Digest",
        channel: "Email",
        trigger: "Schedule: Friday 9AM",
        status: "active",
        last_fired: "3 days ago",
    },
    {
        id: "3",
        name: "Competitor Mention",
        channel: "Slack",
        trigger: "Keyword: 'competitor'",
        status: "paused",
        last_fired: "Never",
    },
];

export default function AlertsPage() {
    const [alerts, setAlerts] = useState(MOCK_ALERTS);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const toggleAlert = (id: string) => {
        setAlerts(alerts.map(a =>
            a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a
        ));
    };

    const deleteAlert = (id: string) => {
        setAlerts(alerts.filter(a => a.id !== id));
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 pb-10">
                {/* Page Header */}
                <div className="border-b border-border p-6 bg-card/30 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground mb-1">Alerts</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage notifications and automated triggers
                                </p>
                            </div>
                        </div>

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Alert
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Create New Alert</DialogTitle>
                                    <DialogDescription>
                                        Configure a new notification rule for your opportunities.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">
                                            Name
                                        </Label>
                                        <Input id="name" placeholder="e.g. VIP Leads" className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="channel" className="text-right">
                                            Channel
                                        </Label>
                                        <Select>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select channel" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="discord">Discord</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="slack">Slack</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="trigger" className="text-right">
                                            Trigger
                                        </Label>
                                        <Select>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select condition" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="score_8">Score {'>'} 8</SelectItem>
                                                <SelectItem value="keyword">Keyword Match</SelectItem>
                                                <SelectItem value="competitor">Competitor Found</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                    <Button type="submit" onClick={() => setIsCreateOpen(false)}>Create Alert</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="px-6 space-y-6 max-w-6xl mx-auto">
                    {/* Alerts Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Rules</CardTitle>
                            <CardDescription>
                                You have {alerts.length} active notification rules running.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {alerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Bell className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">No alerts configured</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                                        Set up notifications to get alerted when opportunities match your criteria.
                                    </p>
                                    <Button onClick={() => setIsCreateOpen(true)}>
                                        Create Your First Alert
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Rule Name</TableHead>
                                            <TableHead>Channel</TableHead>
                                            <TableHead>Trigger Condition</TableHead>
                                            <TableHead>Last Fired</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {alerts.map((alert) => (
                                            <TableRow key={alert.id}>
                                                <TableCell className="font-medium">
                                                    {alert.name}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {alert.channel === "Discord" && <Webhook className="w-4 h-4 text-indigo-400" />}
                                                        {alert.channel === "Email" && <Mail className="w-4 h-4 text-emerald-400" />}
                                                        {alert.channel === "Slack" && <MessageSquare className="w-4 h-4 text-amber-400" />}
                                                        {alert.channel}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {alert.trigger}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {alert.last_fired}
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={alert.status === "active"}
                                                        onCheckedChange={() => toggleAlert(alert.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-white"
                                                        onClick={() => deleteAlert(alert.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Features List */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "Real-time", desc: "Get notified instantly when new execution finishes", icon: Webhook, color: "text-blue-400" },
                            { title: "Digest Mode", desc: "Receive weekly or daily summaries via Email", icon: Mail, color: "text-emerald-400" },
                            { title: "Smart Filters", desc: "Only get alerts for opportunities > 8 score", icon: Bell, color: "text-amber-400" },
                        ].map((feat, i) => (
                            <Card key={i} className="bg-muted/10 border-dashed">
                                <CardHeader>
                                    <feat.icon className={`w-8 h-8 ${feat.color} mb-2`} />
                                    <CardTitle className="text-base">{feat.title}</CardTitle>
                                    <CardDescription>{feat.desc}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
