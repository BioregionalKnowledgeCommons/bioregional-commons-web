import { useQuery } from "@tanstack/react-query";
import type { KoiFederationResponse } from "@/types";

export function useFederation() {
  return useQuery<KoiFederationResponse>({
    queryKey: ["federation"],
    queryFn: async () => {
      const res = await fetch("/api/federation");
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
