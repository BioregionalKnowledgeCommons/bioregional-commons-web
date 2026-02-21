import { useQuery } from "@tanstack/react-query";
import type { KoiEntity } from "@/types";

interface EntitiesResponse {
  entities: KoiEntity[];
  total?: number;
}

export function useEntities(
  nodeId: string | null,
  entityType?: string,
  limit = 50,
  offset = 0
) {
  return useQuery<EntitiesResponse>({
    queryKey: ["entities", nodeId, entityType, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entity_type", entityType);
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const res = await fetch(
        `/api/nodes/${nodeId}/entities?${params.toString()}`
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId,
  });
}
