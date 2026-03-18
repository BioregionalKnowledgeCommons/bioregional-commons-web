import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { Commitment } from "./useCommitments";
import type { ScoreBreakdown } from "./useCommitmentRouting";

export interface RoutingPool {
  pool_rid: string;
  name: string;
  state: string;
  bioregion_uri: string | null;
  need_tags: string[];
  capacity_usd: number | null;
  remaining_capacity_usd: number | null;
  total_pledges: number;
  verified_pledges: number;
  threshold_pct_current: number;
}

export interface RoutingEdge {
  commitment_rid: string;
  commitment_title: string;
  pool_rid: string;
  pool_name: string;
  total_score: number;
  score_breakdown: ScoreBreakdown;
  hard_excludes: string[];
  recommended: boolean;
  explanation: string;
}

export interface RoutingOverviewResponse {
  commitments: Commitment[];
  pools: RoutingPool[];
  routingEdges: RoutingEdge[];
}

export function useRoutingOverview(nodeId = "octo-salish-sea") {
  return useQuery<RoutingOverviewResponse>({
    queryKey: ["routing-overview", nodeId],
    queryFn: async () => {
      const res = await fetch(
        `${apiPath("/api/routing/overview")}?node_id=${nodeId}`
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    },
    refetchInterval: 30_000,
  });
}
