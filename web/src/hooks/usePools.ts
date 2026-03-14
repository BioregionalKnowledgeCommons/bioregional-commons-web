import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";

export interface PoolMetadata {
  need_tags?: string[];
  capacity_usd?: number;
  remaining_capacity_usd?: number;
  activation_threshold_usd?: number;
}

export interface Pool {
  pool_rid: string;
  name: string;
  description: string | null;
  steward_uri: string | null;
  bioregion_uri: string | null;
  activation_threshold_pct: number;
  activation_threshold_count: number | null;
  demurrage_rate_monthly: number;
  state: string;
  metadata: PoolMetadata;
  created_at: string;
  updated_at: string;
}

export function usePools(
  nodeId = "octo-salish-sea",
  filters?: { state?: string }
) {
  const qs = new URLSearchParams();
  if (filters?.state) qs.set("state", filters.state);

  return useQuery<Pool[]>({
    queryKey: ["pools", nodeId, filters],
    queryFn: async () => {
      const res = await fetch(
        `${apiPath("/api/nodes")}/${nodeId}/pools?${qs.toString()}`
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

export function usePledgeToPool(nodeId = "octo-salish-sea") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      poolRid,
      commitmentRid,
    }: {
      poolRid: string;
      commitmentRid: string;
    }) => {
      const res = await fetch(
        `${apiPath("/api/nodes")}/${nodeId}/pools/${encodeURIComponent(poolRid)}/pledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commitment_rid: commitmentRid }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitments", nodeId] });
      qc.invalidateQueries({ queryKey: ["pool-status", nodeId] });
      qc.invalidateQueries({ queryKey: ["pools", nodeId] });
    },
  });
}

export function useTransitionState(nodeId = "octo-salish-sea") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rid,
      newState,
      reason,
    }: {
      rid: string;
      newState: string;
      reason?: string;
    }) => {
      const res = await fetch(
        `${apiPath("/api/nodes")}/${nodeId}/commitments/${encodeURIComponent(rid)}/state`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_state: newState, reason }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `Failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitments", nodeId] });
    },
  });
}
