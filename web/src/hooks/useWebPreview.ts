import { useMutation } from "@tanstack/react-query";
import { apiPath } from "@/lib/constants";

interface WebPreviewRequest {
  url: string;
}

interface WebPreviewResponse {
  url: string;
  rid?: string;
  title?: string;
  description?: string;
  word_count: number;
  is_duplicate?: boolean;
  matching_entities?: unknown[];
  error?: string;
}

export function useWebPreview(nodeId: string | null) {
  return useMutation<WebPreviewResponse, Error, WebPreviewRequest>({
    mutationFn: async ({ url }) => {
      if (!nodeId) throw new Error("No node selected");
      const res = await fetch(apiPath(`/api/nodes/${nodeId}/web/preview`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Preview failed (${res.status})`);
      }
      return res.json();
    },
  });
}
