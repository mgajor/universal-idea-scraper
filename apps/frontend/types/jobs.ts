/**
 * Job & Run Types
 * Types for scraping jobs and job runs.
 */

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

export interface CreateJobRequest {
    name: string;
    target: string;
    is_user?: boolean;
    mode?: string;
    limit?: number;
    download_media?: boolean;
    scrape_comments?: boolean;
    use_plugins?: boolean;
    dedupe?: boolean;
    schedule?: string;
}

// Running job with live stats (for monitor page)
export interface RunningJob {
    runId: string;
    jobName: string;
    target: string;
    progress: number;
    postsScraped: number;
    commentsScraped: number;
    itemsPerMinute: number;
    eta: number;
    logs: LogEntry[];
    status: string;
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
}
