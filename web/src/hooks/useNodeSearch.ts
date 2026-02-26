import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { KoiSearchResult } from "@/types";

interface NodeSearchResponse {
  results: KoiSearchResult[];
  count: number;
}

export function useNodeSearch(nodeId: string | null, query: string, limit = 5) {
  return useQuery<NodeSearchResponse>({
    queryKey: ["node-search", nodeId, query, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/search?${params.toString()}`)
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId && query.trim().length >= 2,
  });
}
