import { useMutation } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";
import type { ChatResponse } from "@/types";

export interface ChatInput {
  message: string;
  answerMode?: "default" | "explainer";
}

export function useChat(nodeId: string | null) {
  return useMutation<ChatResponse, Error, ChatInput>({
    mutationFn: async ({ message, answerMode }: ChatInput) => {
      const payload: Record<string, unknown> = { message };
      if (answerMode && answerMode !== "default") {
        payload.answer_mode = answerMode;
      }
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/chat`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
  return useMutation<ChatResponse & { respondingNode: string; respondingNodeName: string }, Error, ChatInput>({
    mutationFn: async ({ message, answerMode }: ChatInput) => {
      const payload: Record<string, unknown> = { message };
      if (answerMode && answerMode !== "default") {
        payload.answer_mode = answerMode;
      }
      const res = await fetch(apiPath("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Chat failed (${res.status})`);
      }
      return res.json();
    },
  });
}
