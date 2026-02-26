import { useMutation } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { ChatResponse } from "@/types";

export function useChat(nodeId: string | null) {
  return useMutation<ChatResponse, Error, string>({
    mutationFn: async (message: string) => {
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/chat`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Chat failed (${res.status})`);
      }
      return res.json();
    },
  });
}

export function useGlobalChat() {
  return useMutation<ChatResponse & { respondingNode: string; respondingNodeName: string }, Error, string>({
    mutationFn: async (message: string) => {
      const res = await fetch(apiPath("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Chat failed (${res.status})`);
      }
      return res.json();
    },
  });
}
