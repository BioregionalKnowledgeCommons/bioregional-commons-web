import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { KoiHealthResponse } from "@/types";

export function useNodeHealth(nodeId: string | null) {
  return useQuery<KoiHealthResponse>({
    queryKey: ["node-health", nodeId],
    queryFn: async () => {
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/health`));
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId,
    refetchInterval: 30_000,
  });
}
