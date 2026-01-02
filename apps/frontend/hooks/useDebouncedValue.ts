"use client";

import { useState, useEffect } from "react";

/**
 * Debounce a value by a specified delay.
 * Useful for search inputs to avoid excessive API calls.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 * 
 * @example
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 300);
 * 
 * // Use debouncedSearch in your query
 * const { data } = useQuery({
 *   queryKey: ["search", debouncedSearch],
 *   queryFn: () => fetchSearch(debouncedSearch),
 * });
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
