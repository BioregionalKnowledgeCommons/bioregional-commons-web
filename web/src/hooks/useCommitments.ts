import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";

export interface CommitmentMetadata {
  wants?: string[];
  limits?: string[];
  routing_tags?: string[];
  bioregion_uri?: string;
  estimated_value_usd?: number;
  governance_membrane?: string;
}

export interface Commitment {
  commitment_rid: string;
  pledger_uri: string;
  pool_rid: string | null;
  title: string;
  description: string | null;
  offer_type: string;
  quantity: number | null;
  unit: string | null;
  validity_start: string | null;
  validity_end: string | null;
  state: string;
  evidence_uri: string | null;
  metadata: CommitmentMetadata;
  created_at: string;
  updated_at: string;
}

export interface CommitmentCreatePayload {
  pledger_uri: string;
  title: string;
  description?: string;
  offer_type: string;
  quantity?: number;
  unit?: string;
  validity_start?: string;
  validity_end?: string;
  metadata?: CommitmentMetadata;
}

export function useCommitments(
  nodeId = "octo-salish-sea",
  filters?: { state?: string; pool_rid?: string }
) {
  const qs = new URLSearchParams();
  if (filters?.state) qs.set("state", filters.state);
  if (filters?.pool_rid) qs.set("pool_rid", filters.pool_rid);

  return useQuery<Commitment[]>({
    queryKey: ["commitments", nodeId, filters],
    queryFn: async () => {
      const res = await fetch(
        `${apiPath("/api/nodes")}/${nodeId}/commitments?${qs.toString()}`
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

export function useCreateCommitment(nodeId = "octo-salish-sea") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CommitmentCreatePayload) => {
      const res = await fetch(`${apiPath("/api/nodes")}/${nodeId}/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `Failed: ${res.status}`);
      }
      return res.json() as Promise<Commitment>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitments", nodeId] });
    },
  });
}
