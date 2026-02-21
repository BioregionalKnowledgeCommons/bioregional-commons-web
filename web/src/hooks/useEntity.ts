import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { KoiEntity } from "@/types";

export function useEntity(nodeId: string | null, uri: string | null) {
  return useQuery<KoiEntity>({
    queryKey: ["entity", nodeId, uri],
    queryFn: async () => {
      const res = await fetch(
        apiPath(`/api/nodes/${nodeId}/entity?uri=${encodeURIComponent(uri!)}`)

      );
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!nodeId && !!uri,
  });
}
