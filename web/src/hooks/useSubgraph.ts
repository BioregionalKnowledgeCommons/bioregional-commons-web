import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { Subgraph } from "@/types";

export function useSubgraph(
  nodeId: string | null,
  seedUri: string | null,
  depth = 2
) {
  return useQuery<Subgraph>({
    queryKey: ["subgraph", nodeId, seedUri, depth],
    queryFn: async () => {
      const params = new URLSearchParams({
        uri: seedUri!,
        depth: String(depth),
      });
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/subgraph?${params.toString()}`)
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId && !!seedUri,
  });
}
