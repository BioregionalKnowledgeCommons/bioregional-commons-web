import { useQuery } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { KoiFederationResponse } from "@/types";

export function useFederation() {
  return useQuery<KoiFederationResponse>({
    queryKey: ["federation"],
    queryFn: async () => {
      const res = await fetch(apiPath("/api/federation"));
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
