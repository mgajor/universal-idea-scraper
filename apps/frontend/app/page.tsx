"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  FileText,
  MessageSquare,
  TrendingUp,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Zap,
  Target,
  Sparkles,
  BarChart3,
  Layers,
  Database,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ActivityChart } from "@/components/charts/ActivityChart";
import { DiscoveryAnalytics } from "@/components/charts/DiscoveryAnalytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- Components ---


function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "indigo",
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: "indigo" | "violet" | "emerald" | "amber" | "rose" | "cyan";
  delay?: number;
}) {
  const colors = {
    indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className={`relative group overflow-hidden border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-card ${colors[color].split(" ").pop()?.replace("border-", "hover:border-") || ""}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colors[color].split(" ")[0]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        <CardContent className="relative z-10 flex justify-between items-start p-6">
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight mb-1">{value}</div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-muted/50 border border-border ${colors[color].split(" ")[2]} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QueueStatus({ queue }: { queue: { running: number; queued: number } }) {
  const isBusy = queue.running > 0 || queue.queued > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="h-full"
    >
      <Card className="h-full border-border relative overflow-hidden bg-card">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-emerald-400" />
            System Status
          </CardTitle>
          <p className="text-xs text-muted-foreground">Real-time processing metrics</p>
        </CardHeader>

        <CardContent className="space-y-6 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/20 border border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Running</div>
              <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                {queue.running}
                {queue.running > 0 && <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Queued</div>
              <div className="text-2xl font-bold text-foreground">{queue.queued}</div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${isBusy ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
              <span className={isBusy ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
                {isBusy ? 'Processing Jobs' : 'System Idle'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecentJobs({ jobs }: { jobs: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col border-border overflow-hidden bg-card">
        <CardHeader className="p-5 border-b border-border bg-muted/10 flex flex-row justify-between items-center">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2 text-base">
            <Layers className="w-4 h-4 text-primary" />
            Recent Jobs
          </CardTitle>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs font-bold text-primary hover:text-primary/80 hover:bg-transparent uppercase tracking-wide flex items-center gap-1">
              View All <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-border max-h-[300px]">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
              <Briefcase className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No recent jobs found</p>
            </div>
          ) : (
            jobs.slice(0, 5).map((job) => (
              <div key={job.id} className="p-4 hover:bg-muted/20 transition-colors group flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${job.last_run_status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  job.last_run_status === 'running' ? 'bg-cyan-500/10 text-cyan-400' :
                    job.last_run_status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-muted text-muted-foreground'
                  }`}>
                  {job.last_run_status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                    job.last_run_status === 'running' ? <Activity className="w-4 h-4 animate-spin" /> :
                      job.last_run_status === 'failed' ? <XCircle className="w-4 h-4" /> :
                        <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{job.name}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono">{new Date(job.updated_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                    {job.mode}
                    <span className="text-muted-foreground mx-1">|</span>
                    r/{job.target}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// --- Main Page ---

export default function DashboardPage() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 10000 });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => api.jobs.list({ limit: 5 }) });

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-[1600px] mx-auto space-y-8 p-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Real-time overview of your reconnaissance operations</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Link href="/discover">
              <Button variant="premium" className="rounded-xl shadow-lg shadow-indigo-500/25 border-none">
                <Target className="w-4 h-4" />
                New Discovery
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Posts"
            value={(stats?.posts || 0).toLocaleString()}
            icon={FileText}
            color="indigo"
            delay={0.1}
          />
          <StatCard
            title="Total Comments"
            value={(stats?.comments || 0).toLocaleString()}
            icon={MessageSquare}
            color="rose"
            delay={0.15}
          />
          <StatCard
            title="Active Jobs"
            value={stats?.jobs || 0}
            icon={Briefcase}
            color="cyan"
            delay={0.2}
          />
          <StatCard
            title="Total Runs"
            value={(stats?.runs || 0).toLocaleString()}
            icon={Database}
            color="amber"
            delay={0.25}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

          {/* Left Column (Charts) */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="rounded-2xl border-border relative overflow-hidden bg-card">
                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <CardHeader className="relative z-10 pb-2">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Activity Volume
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">7-day trend of data collection</p>
                </CardHeader>
                <CardContent className="h-[300px] w-full relative z-10 pt-4">
                  <ActivityChart />
                </CardContent>
              </Card>
            </motion.div>

            {/* Discovery Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="rounded-2xl border-border h-full bg-card">
                <CardContent className="p-6">
                  <DiscoveryAnalytics />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column (Sidebars) */}
          <div className="space-y-6 flex flex-col">
            <div className="flex-1 min-h-[300px]">
              <RecentJobs jobs={jobs || []} />
            </div>
            <div className="h-auto">
              <QueueStatus queue={stats?.queue || { running: 0, queued: 0 }} />
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="rounded-2xl border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/opportunities" className="block">
                    <Button variant="outline" className="w-full text-left justify-between h-auto py-3 bg-card/50 hover:bg-muted border-border hover:border-primary/50 text-foreground">
                      <span className="font-medium text-foreground group-hover:text-primary">View Opportunities</span>
                      <Sparkles className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                    </Button>
                  </Link>
                  <Link href="/analytics" className="block">
                    <Button variant="outline" className="w-full text-left justify-between h-auto py-3 bg-card/50 hover:bg-muted border-border hover:border-primary/50 text-foreground">
                      <span className="font-medium text-foreground group-hover:text-primary">Full Analytics</span>
                      <BarChart3 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
