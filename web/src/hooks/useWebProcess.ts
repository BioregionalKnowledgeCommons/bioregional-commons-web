import { useMutation } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";

interface WebProcessRequest {
  url: string;
  auto_ingest?: boolean;
}

export interface ExtractedEntity {
  name: string;
  type: string;
  description: string;
  confidence: number;
  fields?: Record<string, unknown>;
}

export interface ExtractedRelationship {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
}

export interface WebProcessResponse {
  title: string;
  summary: string;
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  ingestion_stats?: {
    new_entities: number;
    resolved_entities: number;
    new_relationships: number;
  };
  quality_stats?: {
    total_input: number;
    accepted: number;
    rejected: number;
  };
  model_used?: string;
  url: string;
}

export function useWebProcess(nodeId: string | null) {
  return useMutation<WebProcessResponse, Error, WebProcessRequest>({
    mutationFn: async ({ url, auto_ingest = false }) => {
      if (!nodeId) throw new Error("No node selected");
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/web/process`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, auto_ingest }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Process failed (${res.status})`);
      }
      return res.json();
    },
  });
}
