import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    iconColor?: string; // Tailwind class, e.g. "text-teal-400"
    iconBg?: string; // Tailwind class, e.g. "from-teal-500/20 to-violet-500/20" (gradient) or "bg-primary/10"
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    icon: Icon,
    iconColor = "text-primary",
    iconBg = "bg-primary/10",
    actions,
    children,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn(
            "bg-gradient-to-r from-[#0a0f1a] to-[#0f172a]/90 border-b border-border p-6",
            className
        )}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-3">
                        {Icon && (
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                iconBg.includes("gradient") ? `bg-gradient-to-br ${iconBg}` : iconBg
                            )}>
                                <Icon className={cn("w-5 h-5", iconColor)} />
                            </div>
                        )}
                        {title}
                    </h1>
                    {description && (
                        <p className={cn(
                            "text-sm text-muted-foreground",
                            Icon ? "ml-[52px]" : ""
                        )}>
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                )}
            </div>
            {children && (
                <div className="mt-6 pt-1">
                    {children}
                </div>
            )}
        </div>
    );
}
