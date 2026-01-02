"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { Bell, CheckCircle, XCircle, Brain, Download, Info, Check, Trash2, Ban, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

// Icon map for notification types
const iconMap = {
    job_completed: { icon: CheckCircle, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
    job_failed: { icon: XCircle, color: "text-red-400", bgColor: "bg-red-500/20" },
    job_cancelled: { icon: Ban, color: "text-amber-400", bgColor: "bg-amber-500/20" },
    analysis_completed: { icon: Brain, color: "text-purple-400", bgColor: "bg-purple-500/20" },
    export_ready: { icon: Download, color: "text-blue-400", bgColor: "bg-blue-500/20" },
    info: { icon: Info, color: "text-gray-400", bgColor: "bg-gray-500/20" },
};

// Single Notification Item
function NotificationItem({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
    const { icon: Icon, color, bgColor } = iconMap[notification.type] || iconMap.info;

    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`w-full p-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors text-left ${!notification.read ? "bg-indigo-500/5" : ""
                }`}
            onClick={onClick}
        >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className={`font-medium text-sm ${!notification.read ? "text-white" : "text-gray-300"}`}>
                        {notification.title}
                    </h4>
                    {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">{notification.message}</p>
                <p className="text-[10px] text-gray-600 mt-1">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                </p>
            </div>
        </motion.button>
    );
}

// Notification Center Component
export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, isConnected } = useNotifications();
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: AppNotification) => {
        markAsRead(notification.id);
        setIsOpen(false);

        // Navigate based on notification type
        if (notification.data?.runId) {
            router.push(`/monitor`);
        } else if (notification.data?.jobId) {
            router.push(`/jobs/${notification.data.jobId}`);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <motion.button
                className="p-2.5 rounded-xl bg-card/50 backdrop-blur-md border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.05] relative group shadow-lg shadow-black/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background"
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                )}

                {/* Connection indicator */}
                <span
                    className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background ${isConnected ? "bg-emerald-500" : "bg-red-500"
                        }`}
                />
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }}
                        className="absolute right-0 top-full mt-2 w-80 glass rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-white/[0.08] z-50"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">Notifications</h3>
                                {isConnected ? (
                                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                        <Wifi className="w-3 h-3" /> Live
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-red-400">
                                        <WifiOff className="w-3 h-3" /> Offline
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                        onClick={markAllAsRead}
                                        title="Mark all as read"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                                        onClick={clearAll}
                                        title="Clear all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.03]">
                            <AnimatePresence mode="popLayout">
                                {notifications.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-8 text-center"
                                    >
                                        <Bell className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                                        <p className="text-sm text-gray-500">No notifications yet</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            You'll be notified when jobs complete
                                        </p>
                                    </motion.div>
                                ) : (
                                    notifications.slice(0, 10).map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification)}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        {notifications.length > 10 && (
                            <div className="p-3 border-t border-white/[0.06] text-center">
                                <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                    View all {notifications.length} notifications
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
