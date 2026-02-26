import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";

export interface CommonsShare {
  id: number;
  event_id: string | null;
  document_rid: string;
  sender: string;
  sender_node_rid: string;
  intake_status: string;
  received_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  manifest: Record<string, unknown>;
  has_contents: boolean;
}

export interface CommonsDecision {
  id: number;
  share_id: number;
  action: string;
  reviewer: string | null;
  note: string | null;
  decided_at: string;
}

export interface MergeCandidate {
  id: number;
  share_id: number;
  remote_entity_label: string;
  remote_entity_type: string | null;
  local_entity_uri: string;
  local_entity_label: string;
  confidence: number;
  resolution: "merge" | "keep_separate" | "cross_ref" | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function useCommonsIntake(nodeId: string | null, status = "staged") {
  return useQuery({
    queryKey: ["commons-intake", nodeId, status],
    queryFn: async () => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/commons/intake?status=${status}`)
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ documents: CommonsShare[]; count: number }>;
    },
    enabled: !!nodeId,
    refetchInterval: 15_000,
  });
}

export function useCommonsDecide(nodeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      share_id: number;
      action: "approve" | "reject";
      reviewer?: string;
      note?: string;
    }) => {
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/commons/decide`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commons-intake", nodeId] });
    },
  });
}

export function useCommonsDecisions(nodeId: string | null, shareId: number | null) {
  return useQuery({
    queryKey: ["commons-decisions", nodeId, shareId],
    queryFn: async () => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/commons/decisions/${shareId}`)
      );
      if (!res.ok) throw new Error("Failed to fetch decisions");
      return res.json() as Promise<{ decisions: CommonsDecision[] }>;
    },
    enabled: !!nodeId && shareId !== null,
  });
}

export function useMergeCandidates(nodeId: string | null, shareId: number | null) {
  return useQuery({
    queryKey: ["merge-candidates", nodeId, shareId],
    queryFn: async () => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/commons/merge-candidates/${shareId}`)
      );
      if (!res.ok) throw new Error("Failed to fetch merge candidates");
      return res.json() as Promise<{
        candidates: MergeCandidate[];
        count: number;
        unresolved: number;
        share_id: number;
      }>;
    },
    enabled: !!nodeId && shareId !== null,
  });
}

export function useResolveMerges(nodeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      share_id: number;
      resolutions: {
        candidate_id: number;
        resolution: "merge" | "keep_separate" | "cross_ref";
        resolved_by?: string;
      }[];
    }) => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/commons/resolve-merges/${params.share_id}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolutions: params.resolutions }),
        }
      );
      if (!res.ok) throw new Error("Failed to resolve merges");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["merge-candidates", nodeId, variables.share_id] });
      qc.invalidateQueries({ queryKey: ["commons-intake", nodeId] });
    },
  });
}
