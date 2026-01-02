"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 * 
 * @example
 * <ErrorBoundary>
 *   <PageContent />
 * </ErrorBoundary>
 * 
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <PageContent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console in development
        console.error("ErrorBoundary caught an error:", error, errorInfo);

        // TODO: Send to error tracking service in production
        // e.g., Sentry.captureException(error);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-[400px] p-6">
                    <Card className="max-w-md w-full border-destructive/50">
                        <CardContent className="pt-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                            <p className="text-muted-foreground mb-4 text-sm">
                                {this.state.error?.message || "An unexpected error occurred while rendering this page."}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                    className="gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Reload Page
                                </Button>
                                <Button asChild className="gap-2">
                                    <Link href="/">
                                        <Home className="w-4 h-4" />
                                        Go Home
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Default Error Fallback Component
 * Can be used standalone or as a fallback prop for ErrorBoundary.
 */
export function ErrorFallback({
    error,
    resetError
}: {
    error?: Error;
    resetError?: () => void;
}) {
    return (
        <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load</h3>
                <p className="text-muted-foreground text-sm mb-4">
                    {error?.message || "Something went wrong"}
                </p>
                {resetError && (
                    <Button onClick={resetError} variant="outline" size="sm">
                        Try Again
                    </Button>
                )}
            </div>
        </div>
    );
}
