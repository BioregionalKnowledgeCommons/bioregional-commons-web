import { useMutation } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";

interface WebIngestRequest {
  url: string;
  entities: Array<{ name: string; type: string; confidence?: number }>;
  relationships: Array<{ subject: string; predicate: string; object: string }>;
}

export interface WebIngestResult {
  ingestion_stats: {
    new_entities: number;
    resolved_entities: number;
    new_relationships: number;
  };
}

export function useWebIngest(nodeId: string | null) {
  return useMutation<WebIngestResult, Error, WebIngestRequest>({
    mutationFn: async (body) => {
      if (!nodeId) throw new Error("No node selected");
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/web/ingest`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Ingest failed (${res.status})`);
      }
      const raw = await res.json();
      return {
        ingestion_stats: {
          new_entities: raw.entities_created ?? 0,
          resolved_entities: raw.entities_resolved ?? 0,
          new_relationships: raw.relationships_created ?? 0,
        },
      };
    },
  });
}
