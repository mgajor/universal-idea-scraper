"use client";

/**
 * Discovery Hooks
 * React Query hooks for problem discovery, search jobs, and analysis.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ============================================
// Platform & Keywords Hooks
// ============================================

/**
 * Fetch available platforms for discovery.
 * Cached for 5 minutes since platforms rarely change.
 */
export function usePlatforms() {
    return useQuery({
        queryKey: ["discovery", "platforms"],
        queryFn: () => api.discovery.platforms(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Fetch default keywords for discovery.
 * Cached for 5 minutes since keywords rarely change.
 */
export function useKeywords() {
    return useQuery({
        queryKey: ["discovery", "keywords"],
        queryFn: () => api.discovery.keywords(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

// ============================================
// Problems Hooks
// ============================================

interface UseProblemsParams {
    limit?: number;
    offset?: number;
    platform?: string;
    is_saved?: boolean;
    min_score?: number;
    category?: string;
    search?: string;
}

/**
 * Fetch discovered problems with optional filters.
 */
export function useProblems(params: UseProblemsParams = {}) {
    return useQuery({
        queryKey: ["discovery", "problems", params],
        queryFn: () => api.discovery.problems({
            limit: params.limit ?? 100,
            ...params,
        }),
        placeholderData: (previousData) => previousData, // Keep showing old data while fetching new
    });
}

/**
 * Fetch a single problem with full insights.
 */
export function useProblemDetail(id: string | null) {
    return useQuery({
        queryKey: ["discovery", "problem", id],
        queryFn: () => api.discovery.getProblem(id!),
        enabled: !!id,
    });
}

/**
 * Toggle saved status on a problem.
 */
export function useToggleProblemSave() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.discovery.toggleSave(id),
        onSuccess: () => {
            // Invalidate problems list to reflect the change
            queryClient.invalidateQueries({ queryKey: ["discovery", "problems"] });
        },
        // Optimistic update for faster UI feedback
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ["discovery", "problems"] });

            // Snapshot previous value
            const previousProblems = queryClient.getQueryData(["discovery", "problems"]);

            // Optimistically update
            queryClient.setQueriesData(
                { queryKey: ["discovery", "problems"] },
                (old: any[] | undefined) => {
                    if (!old) return old;
                    return old.map((p) =>
                        p.id === id ? { ...p, is_saved: !p.is_saved } : p
                    );
                }
            );

            return { previousProblems };
        },
        onError: (_err, _id, context) => {
            // Rollback on error
            if (context?.previousProblems) {
                queryClient.setQueryData(["discovery", "problems"], context.previousProblems);
            }
        },
    });
}

/**
 * Analyze a problem with AI.
 */
export function useAnalyzeProblem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.discovery.analyze(id),
        onSuccess: (data, id) => {
            // Invalidate specific problem and list
            queryClient.invalidateQueries({ queryKey: ["discovery", "problem", id] });
            queryClient.invalidateQueries({ queryKey: ["discovery", "problems"] });
        },
    });
}

// ============================================
// Search Jobs Hooks
// ============================================

interface UseSearchJobsParams {
    limit?: number;
    status?: string;
}

/**
 * Fetch search jobs list.
 */
export function useSearchJobs(params: UseSearchJobsParams = {}) {
    return useQuery({
        queryKey: ["discovery", "jobs", params],
        queryFn: () => api.discovery.jobs({
            limit: params.limit ?? 20,
            ...params,
        }),
    });
}

/**
 * Create a new search job.
 */
export function useCreateSearchJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: {
            name: string;
            keywords: string[];
            platforms: string[];
            max_results?: number;
            time_filter?: string;
        }) => api.discovery.createJob(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["discovery", "jobs"] });
        },
    });
}

/**
 * Run a search job.
 */
export function useRunSearchJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.discovery.runJob(id),
        onSuccess: () => {
            // Invalidate both jobs and problems lists
            queryClient.invalidateQueries({ queryKey: ["discovery"] });
        },
    });
}

/**
 * Delete a search job.
 */
export function useDeleteSearchJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.discovery.deleteJob(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["discovery", "jobs"] });
        },
    });
}

// ============================================
// Trends Hook
// ============================================

/**
 * Fetch discovery trends data.
 */
export function useDiscoveryTrends() {
    return useQuery({
        queryKey: ["discovery", "trends"],
        queryFn: () => api.discovery.trends(),
        staleTime: 60 * 1000, // 1 minute
    });
}
