import { useQuery } from "@tanstack/react-query";
import type { SettlementSnapshot } from "@/components/flow-funding/types";

interface SettlementsResponse {
  settlements: SettlementSnapshot[];
  total: number;
}

export function useSettlements(nodeId = "octo-salish-sea") {
  return useQuery<SettlementsResponse>({
    queryKey: ["flow-funding-settlements", nodeId],
    queryFn: async () => {
      const res = await fetch(
        `/api/flow-funding/settlements?node_id=${nodeId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch settlements: ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
