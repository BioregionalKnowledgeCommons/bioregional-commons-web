import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Fetch koi-net health (peers) and edges from the coordinator node (Octo)
  const [healthResult, edgesResult] = await Promise.allSettled([
    bffFetch("octo-salish-sea", "/koi-net/health"),
    bffFetch("octo-salish-sea", "/koi-net/edges"),
  ]);

  const health =
    healthResult.status === "fulfilled"
      ? (healthResult.value as Record<string, unknown>)
      : null;
  const edges =
    edgesResult.status === "fulfilled"
      ? (edgesResult.value as Record<string, unknown>)
      : null;

  return NextResponse.json({
    peers: health?.peers ?? [],
    edges: edges?.edges ?? [],
    node: health?.node ?? null,
    event_queue_size: health?.event_queue_size ?? 0,
    timestamp: health?.timestamp ?? new Date().toISOString(),
  });
}
