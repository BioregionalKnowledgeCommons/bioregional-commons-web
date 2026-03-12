import { useMutation, useQueryClient } from "@tanstack/react-query";

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
        `/api/nodes/${nodeId}/pools/${encodeURIComponent(poolRid)}/pledge`,
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
        `/api/nodes/${nodeId}/commitments/${encodeURIComponent(rid)}/state`,
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
