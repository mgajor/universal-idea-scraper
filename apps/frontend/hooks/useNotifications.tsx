"use client";

import { useEffect, useRef, useState, useCallback, createContext, useContext, ReactNode } from "react";

// Notification types
export interface AppNotification {
    id: string;
    type: "job_completed" | "job_failed" | "job_cancelled" | "analysis_completed" | "export_ready" | "info";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    data?: {
        jobId?: string;
        runId?: string;
        target?: string;
        postsScraped?: number;
        durationSeconds?: number;
        error?: string;
    };
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within NotificationProvider");
    }
    return context;
}

// Provider Component
export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load notifications from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("notifications");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp),
                })));
            } catch (e) {
                console.error("Failed to parse stored notifications:", e);
            }
        }
    }, []);

    // Save notifications to localStorage when they change
    useEffect(() => {
        localStorage.setItem("notifications", JSON.stringify(notifications));
    }, [notifications]);

    // Add notification
    const addNotification = useCallback((notification: Omit<AppNotification, "id" | "timestamp" | "read">) => {
        const newNotification: AppNotification = {
            ...notification,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50

        // Show browser notification if permitted
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(notification.title, {
                body: notification.message,
                icon: "/favicon.ico",
            });
        }
    }, []);

    // WebSocket connection
    const connect = useCallback(() => {
        const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") || "ws://localhost:8000"}/ws/notifications`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("🔔 Notification WebSocket connected");
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle different notification types
                    if (data.type === "job_completed") {
                        addNotification({
                            type: "job_completed",
                            title: "Job Completed",
                            message: `Scraped ${data.posts_scraped || 0} posts from ${data.target}`,
                            data: {
                                jobId: data.job_id,
                                runId: data.run_id,
                                target: data.target,
                                postsScraped: data.posts_scraped,
                                durationSeconds: data.duration_seconds,
                            },
                        });
                    } else if (data.type === "job_failed") {
                        addNotification({
                            type: "job_failed",
                            title: "Job Failed",
                            message: `Failed to scrape ${data.target}: ${data.error || "Unknown error"}`,
                            data: {
                                jobId: data.job_id,
                                runId: data.run_id,
                                target: data.target,
                                error: data.error,
                            },
                        });
                    } else if (data.type === "job_cancelled") {
                        addNotification({
                            type: "job_cancelled",
                            title: "Job Cancelled",
                            message: `Scraping job for ${data.target} was cancelled`,
                            data: {
                                jobId: data.job_id,
                                runId: data.run_id,
                                target: data.target,
                            },
                        });
                    } else if (data.type === "analysis_completed") {
                        addNotification({
                            type: "analysis_completed",
                            title: "Analysis Complete",
                            message: data.message || "AI analysis has completed",
                            data: data,
                        });
                    } else if (data.type === "export_ready") {
                        addNotification({
                            type: "export_ready",
                            title: "Export Ready",
                            message: data.message || "Your export is ready to download",
                            data: data,
                        });
                    } else if (data.type === "pong") {
                        // Heartbeat response, ignore
                    }
                } catch (e) {
                    console.error("Failed to parse WebSocket message:", e);
                }
            };

            ws.onclose = () => {
                console.log("🔔 Notification WebSocket disconnected");
                setIsConnected(false);
                wsRef.current = null;

                // Reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 3000);
            };

            ws.onerror = () => {
                // Squelch verbose errors, connection issues are handled by onclose/reconnect
                // console.error("WebSocket error:", error);
            };
        } catch (e) {
            console.error("Failed to connect WebSocket:", e);
            // Retry connection
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 5000);
        }
    }, [addNotification]);

    // Connect on mount
    useEffect(() => {
        connect();

        // Heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000);

        // Request browser notification permission
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            clearInterval(heartbeatInterval);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    // Mark as read
    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    // Clear all
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearAll,
                isConnected,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}
