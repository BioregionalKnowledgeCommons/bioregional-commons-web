import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { KoiStatsResponse } from "@/types";

export function useNodeStats(nodeId: string | null) {
  return useQuery<KoiStatsResponse>({
    queryKey: ["node-stats", nodeId],
    queryFn: async () => {
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/stats`));
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId,
  });
}
