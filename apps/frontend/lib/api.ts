/**
 * Reddit Ops Console - API Client
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Job {
    id: string;
    name: string;
    target: string;
    is_user: boolean;
    mode: string;
    limit: number;
    download_media: boolean;
    scrape_comments: boolean;
    use_plugins: boolean;
    enabled: boolean;
    schedule: string | null;
    created_at: string;
    updated_at: string;
    last_run_at: string | null;
    last_run_status: string | null;
    total_runs: number;
}

export interface JobRun {
    id: string;
    job_id: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    duration_seconds: number | null;
    posts_scraped: number;
    comments_scraped: number;
    media_downloaded: number;
    progress_percent: number;
    items_per_minute: number | null;
    eta_seconds: number | null;
    error_message: string | null;
}

export interface Post {
    id: string;
    subreddit: string;
    title: string;
    author: string | null;
    created_utc: string | null;
    permalink: string;
    url: string | null;
    score: number;
    upvote_ratio: number;
    num_comments: number;
    selftext: string | null;
    post_type: string;
    is_nsfw: boolean;
    flair: string | null;
    has_media: boolean;
    sentiment_score: number | null;
    sentiment_label: string | null;
}

export interface AnalyticsOverview {
    total_posts: number;
    total_comments: number;
    total_subreddits: number;
    total_score: number;
    avg_score: number;
    posts_today: number;
    posts_this_week: number;
}

export interface SystemStats {
    jobs: number;
    runs: number;
    posts: number;
    comments: number;
    queue: {
        running: number;
        queued: number;
    };
}

export interface Collection {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    problem_count: number;
    created_at: string;
    updated_at: string;
}

export interface CollectionWithProblems extends Collection {
    problem_ids: string[];
}

// Generic fetch wrapper
async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(error.detail || `HTTP ${res.status}`);
    }

    return res.json();
}

// System
export const api = {
    // Health
    health: () => apiFetch<{ status: string }>("/health"),
    stats: () => apiFetch<SystemStats>("/stats/overview"),

    // Jobs
    jobs: {
        list: (params?: { enabled?: boolean; limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.enabled !== undefined) searchParams.set("enabled", String(params.enabled));
            if (params?.limit) searchParams.set("limit", String(params.limit));
            return apiFetch<Job[]>(`/jobs?${searchParams}`);
        },
        get: (id: string) => apiFetch<Job>(`/jobs/${id}`),
        create: (data: Partial<Job>) =>
            apiFetch<Job>("/jobs", { method: "POST", body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Job>) =>
            apiFetch<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
        delete: (id: string) =>
            apiFetch<{ message: string }>(`/jobs/${id}`, { method: "DELETE" }),
        run: (id: string) =>
            apiFetch<{ run_id: string; job_id: string; status: string; message: string }>(
                `/jobs/${id}/run`,
                { method: "POST" }
            ),
        clone: (id: string) =>
            apiFetch<Job>(`/jobs/${id}/clone`, { method: "POST" }),
        runs: (id: string, params?: { limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.set("limit", String(params.limit));
            return apiFetch<JobRun[]>(`/jobs/${id}/runs?${searchParams}`);
        },
    },

    // Runs
    runs: {
        list: (params?: { status?: string; job_id?: string; limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.status) searchParams.set("status", params.status);
            if (params?.job_id) searchParams.set("job_id", params.job_id);
            if (params?.limit) searchParams.set("limit", String(params.limit));
            return apiFetch<JobRun[]>(`/runs?${searchParams}`);
        },
        get: (id: string) => apiFetch<JobRun>(`/runs/${id}`),
        cancel: (id: string) =>
            apiFetch<{ message: string }>(`/runs/${id}/cancel`, { method: "POST" }),
        retry: (id: string) =>
            apiFetch<{ new_run_id: string }>(`/runs/${id}/retry`, { method: "POST" }),
    },

    // Data
    posts: {
        list: (params?: Record<string, string | number | boolean>) => {
            const searchParams = new URLSearchParams();
            if (params) {
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== undefined && v !== null) searchParams.set(k, String(v));
                });
            }
            return apiFetch<{ items: Post[]; total: number; has_more: boolean }>(`/posts?${searchParams}`);
        },
        get: (id: string) => apiFetch<Post>(`/posts/${id}`),
    },

    search: (params: { q: string; type?: string; subreddit?: string; limit?: number }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("q", params.q);
        if (params.type) searchParams.set("type", params.type);
        if (params.subreddit) searchParams.set("subreddit", params.subreddit);
        if (params.limit) searchParams.set("limit", String(params.limit));
        return apiFetch<{ items: any[]; total: number }>(`/search?${searchParams}`);
    },

    // Analytics
    analytics: {
        overview: () => apiFetch<AnalyticsOverview>("/analytics/overview"),
        timeseries: (params?: { subreddit?: string; days?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.subreddit) searchParams.set("subreddit", params.subreddit);
            if (params?.days) searchParams.set("days", String(params.days));
            return apiFetch<{ date: string; posts: number; comments: number; total_score: number }[]>(
                `/analytics/timeseries?${searchParams}`
            );
        },
        keywords: (params?: { subreddit?: string; limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.subreddit) searchParams.set("subreddit", params.subreddit);
            if (params?.limit) searchParams.set("limit", String(params.limit));
            return apiFetch<{ keyword: string; count: number }[]>(`/analytics/top_keywords?${searchParams}`);
        },
        distributions: {
            postTypes: (subreddit?: string) => {
                const params = subreddit ? `?subreddit=${subreddit}` : "";
                return apiFetch<{ label: string; count: number }[]>(`/analytics/distributions/post_types${params}`);
            },
            sentiment: (subreddit?: string) => {
                const params = subreddit ? `?subreddit=${subreddit}` : "";
                return apiFetch<{ label: string; count: number }[]>(`/analytics/distributions/sentiment${params}`);
            },
            score: (subreddit?: string) => {
                const params = subreddit ? `?subreddit=${subreddit}` : "";
                return apiFetch<{ label: string; count: number }[]>(`/analytics/distributions/score${params}`);
            },
        },
        topAuthors: (params?: { subreddit?: string; limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.subreddit) searchParams.set("subreddit", params.subreddit);
            if (params?.limit) searchParams.set("limit", String(params.limit));
            return apiFetch<{ author: string; post_count: number; total_score: number; avg_score: number }[]>(
                `/analytics/top_authors?${searchParams}`
            );
        },
        activity: (digits: number = 7) => apiFetch<{ name: string; full_date: string; posts: number; comments: number }[]>(`/analytics/activity?days=${digits}`),
    },

    // Subreddits
    subreddits: () =>
        apiFetch<{ subreddit: string; post_count: number; comment_count: number; total_score: number }[]>(
            "/subreddits"
        ),

    // Exports
    exports: {
        list: () => apiFetch<any[]>("/exports"),
        create: (data: { name: string; format: string; filters?: any; columns?: string[] }) =>
            apiFetch<any>("/exports", { method: "POST", body: JSON.stringify(data) }),
        get: (id: string) => apiFetch<any>(`/exports/${id}`),
        downloadUrl: (id: string) => `${API_BASE}/exports/${id}/download`,
    },

    // Plugins
    plugins: {
        list: () => apiFetch<any[]>("/plugins"),
        configure: (name: string, config: { enabled?: boolean; config?: any }) =>
            apiFetch<any>(`/plugins/${name}/configure`, { method: "POST", body: JSON.stringify(config) }),
    },

    // Collections
    collections: {
        list: () => apiFetch<Collection[]>("/collections"),
        create: (data: { name: string; description?: string; color?: string; icon?: string }) =>
            apiFetch<Collection>("/collections", { method: "POST", body: JSON.stringify(data) }),
        get: (id: string) => apiFetch<CollectionWithProblems>(`/collections/${id}`),
        update: (id: string, data: { name?: string; description?: string; color?: string; icon?: string }) =>
            apiFetch<Collection>(`/collections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch<any>(`/collections/${id}`, { method: "DELETE" }),
        addProblems: (id: string, problemIds: string[]) =>
            apiFetch<any>(`/collections/${id}/problems`, { method: "POST", body: JSON.stringify({ problem_ids: problemIds }) }),
        removeProblem: (collectionId: string, problemId: string) =>
            apiFetch<any>(`/collections/${collectionId}/problems/${problemId}`, { method: "DELETE" }),
        getProblems: (id: string) => apiFetch<any[]>(`/collections/${id}/problems`),
    },

    // Discovery / Problem Finding
    discovery: {
        // Get available platforms
        platforms: () =>
            apiFetch<{ platforms: { id: string; name: string; icon: string; description: string; enabled: boolean }[] }>(
                "/discovery/platforms"
            ),

        // Get default keywords
        keywords: () =>
            apiFetch<{ keywords: string[] }>("/discovery/keywords"),

        // List discovered problems
        problems: (params?: {
            limit?: number;
            offset?: number;
            platform?: string;
            is_saved?: boolean;
            min_score?: number;
            category?: string;
            search?: string;
        }) => {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.set("limit", String(params.limit));
            if (params?.offset) searchParams.set("offset", String(params.offset));
            if (params?.platform) searchParams.set("platform", params.platform);
            if (params?.is_saved !== undefined) searchParams.set("is_saved", String(params.is_saved));
            if (params?.min_score) searchParams.set("min_score", String(params.min_score));
            if (params?.category) searchParams.set("category", params.category);
            if (params?.search) searchParams.set("search", params.search);
            return apiFetch<any[]>(`/discovery/problems?${searchParams.toString()}`);
        },

        // Get single problem with insights
        getProblem: (id: string) =>
            apiFetch<any>(`/discovery/problems/${id}`),

        // Toggle save status
        toggleSave: (id: string) =>
            apiFetch<any>(`/discovery/problems/${id}/save`, { method: "POST" }),

        // Analyze a problem with AI
        analyze: (id: string) =>
            apiFetch<any>(`/discovery/problems/${id}/analyze`, { method: "POST" }),

        // List search jobs
        jobs: (params?: { limit?: number; status?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.set("limit", String(params.limit));
            if (params?.status) searchParams.set("status", params.status);
            return apiFetch<any[]>(`/discovery/jobs?${searchParams.toString()}`);
        },

        // Create search job
        createJob: (data: {
            name: string;
            keywords: string[];
            platforms: string[];
            max_results?: number;
            time_filter?: string;
        }) =>
            apiFetch<any>("/discovery/jobs", { method: "POST", body: JSON.stringify(data) }),

        // Run a search job
        runJob: (id: string) =>
            apiFetch<any>(`/discovery/jobs/${id}/run`, { method: "POST" }),

        // Delete a search job
        deleteJob: (id: string) =>
            apiFetch<any>(`/discovery/jobs/${id}`, { method: "DELETE" }),

        // Get trends data
        trends: () =>
            apiFetch<any>("/discovery/trends"),
    },
};

// WebSocket helper
export function connectRunStream(
    runId: string,
    onMessage: (event: any) => void,
    onClose?: () => void
): WebSocket {
    const wsUrl = `${API_BASE.replace("http", "ws")}/runs/${runId}/stream`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (e) {
            console.error("Failed to parse WS message:", e);
        }
    };

    ws.onclose = () => {
        onClose?.();
    };

    return ws;
}
