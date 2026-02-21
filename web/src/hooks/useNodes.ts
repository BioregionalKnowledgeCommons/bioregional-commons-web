import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { KoiLiveNode } from "@/types";

interface NodesResponse {
  nodes: KoiLiveNode[];
}

export function useNodes() {
  return useQuery<NodesResponse>({
    queryKey: ["nodes"],
    queryFn: async () => {
      const res = await fetch(apiPath("/api/nodes"));
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    refetchInterval: 30_000,
  });
}
