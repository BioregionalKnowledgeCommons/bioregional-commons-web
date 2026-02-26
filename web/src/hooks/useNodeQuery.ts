import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { QueryResult } from "@/types";

export function useNodeQuery(nodeId: string | null, query: string) {
  return useQuery<QueryResult>({
    queryKey: ["node-query", nodeId, query],
    queryFn: async () => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/query?q=${encodeURIComponent(query)}`)
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId && query.trim().length >= 2,
  });
}
