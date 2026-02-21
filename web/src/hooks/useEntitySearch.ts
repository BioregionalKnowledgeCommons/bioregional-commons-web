import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiPath } from "@/lib/constants";
import type { KoiSearchResult } from "@/types";

interface SearchResponse {
  results: KoiSearchResult[];
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useEntitySearch(nodeId: string | null, query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  return useQuery<SearchResponse>({
    queryKey: ["entity-search", nodeId, debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/search?q=${encodeURIComponent(debouncedQuery)}`)
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId && debouncedQuery.length >= 2,
  });
}
