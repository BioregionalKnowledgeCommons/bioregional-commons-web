import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { KoiRelationship } from "@/types";

interface RelationshipsResponse {
  relationships: KoiRelationship[];
}

export function useRelationships(nodeId: string | null, uri: string | null) {
  return useQuery<RelationshipsResponse>({
    queryKey: ["relationships", nodeId, uri],
    queryFn: async () => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/relationships?uri=${encodeURIComponent(uri!)}`)

      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId && !!uri,
  });
}
