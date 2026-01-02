/**
 * Common/Shared Types
 * Utility types used across the application.
 */

// Pagination response wrapper
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

// API error response
export interface ApiError {
    detail: string;
    status_code?: number;
}

// System stats
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

// Health check response
export interface HealthCheck {
    status: "healthy" | "degraded" | "unhealthy";
    database: string;
    queue: {
        running: number;
        queued: number;
    };
}

// Analytics overview
export interface AnalyticsOverview {
    total_posts: number;
    total_comments: number;
    total_subreddits: number;
    total_score: number;
    avg_score: number;
    posts_today: number;
    posts_this_week: number;
}

// Collection types
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

// Post types
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
