import { useMutation } from "@tanstack/react-query";

export interface ScoreBreakdown {
  same_bioregion: number;
  offer_need_overlap: number;
  timeframe_overlap: number;
  capacity_fit: number;
  governance_compat: number;
}

export interface PoolSuggestion {
  pool_rid: string;
  pool_name: string;
  total_score: number;
  score_breakdown: ScoreBreakdown;
  hard_excludes: string[];
  recommended: boolean;
  explanation: string;
}

export interface RoutingSuggestionsResponse {
  suggestions: PoolSuggestion[];
}

export interface RoutingDraft {
  pledger_uri?: string;
  title?: string;
  offer_type?: string;
  quantity?: number;
  unit?: string;
  validity_start?: string;
  validity_end?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export function useCommitmentRouting(nodeId = "octo-salish-sea") {
  return useMutation({
    mutationFn: async (draft: RoutingDraft) => {
      const res = await fetch(`/api/nodes/${nodeId}/commitments/routing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json() as Promise<RoutingSuggestionsResponse>;
    },
  });
}
