"use client";

import { useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { CheckCircle, XCircle, Brain, Download, Info, Ban } from "lucide-react";
import { useRouter } from "next/navigation";

// Icon map
const iconMap: Record<string, any> = {
    job_completed: CheckCircle,
    job_failed: XCircle,
    job_cancelled: Ban,
    analysis_completed: Brain,
    export_ready: Download,
    info: Info,
};

// Colors for the icon (optional, Sonner handles this well with 'richColors' or default, but we can pass styles)
// Actually Sonner standard is clean monochrome or subtle colors. I'll stick to default or simple icons.
// I will not manually colorize the toast background unless imperative.

export function ToastContainer() {
    const { notifications, markAsRead } = useNotifications();
    const router = useRouter();
    const lastProcessedIdRef = useRef<string | null>(null);

    useEffect(() => {
        // If we have notifications
        if (notifications.length > 0) {
            // Get the newest one (index 0)
            const latest = notifications[0];

            // If it's new (not the one we just processed)
            if (latest.id !== lastProcessedIdRef.current && !latest.read) {
                lastProcessedIdRef.current = latest.id;

                const Icon = iconMap[latest.type] || Info;

                // Trigger Sonner
                toast(latest.title, {
                    description: latest.message,
                    icon: <Icon className="w-4 h-4" />,
                    action: latest.data?.jobId || latest.data?.runId ? {
                        label: "View",
                        onClick: () => {
                            if (latest.data?.runId) {
                                router.push(`/monitor`);
                            } else if (latest.data?.jobId) {
                                router.push(`/jobs/${latest.data.jobId}`);
                            }
                        }
                    } : undefined,
                    onDismiss: () => {
                        markAsRead(latest.id);
                    },
                    onAutoClose: () => {
                        markAsRead(latest.id);
                    }
                });
            }
        }
    }, [notifications, router, markAsRead]);

    return null; // Render nothing, Sonner handles the UI via <Toaster /> in layout
}
