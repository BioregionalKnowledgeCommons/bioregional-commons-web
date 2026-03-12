import { useQuery } from "@tanstack/react-query";

interface Participant {
  uri: string;
  name: string;
  entity_type: string;
}

interface ParticipantsResponse {
  entities: Participant[];
}

export function useParticipants(nodeId = "octo-salish-sea") {
  return useQuery<ParticipantsResponse>({
    queryKey: ["flow-funding-participants", nodeId],
    queryFn: async () => {
      const res = await fetch(
        `/api/flow-funding/participants?node_id=${nodeId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch participants: ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
