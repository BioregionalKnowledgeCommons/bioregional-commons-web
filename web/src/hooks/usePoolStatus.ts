import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";

export interface PoolStatus {
  pool_rid: string;
  pool_state: string;
  name: string;
  total_pledges: number;
  verified_pledges: number;
  threshold_pct_required: number;
  threshold_pct_current: number;
  threshold_met: boolean;
  pledge_counts_by_state: Record<string, number>;
  demurrage_rate_monthly: number;
}

export function usePoolStatus(nodeId: string, poolRid: string) {
  return useQuery<PoolStatus>({
    queryKey: ["pool-status", nodeId, poolRid],
    queryFn: async () => {
      const res = await fetch(
        `${apiPath("/api/nodes")}/${nodeId}/pools/${encodeURIComponent(poolRid)}/status`
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    },
    enabled: !!poolRid,
    refetchInterval: 30_000,
  });
}
