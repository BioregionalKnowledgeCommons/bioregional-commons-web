import { NextResponse } from "next/server";
import { getPublicNodes, NODE_REGISTRY } from "@/lib/node-registry.server";
import { bffFetch } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicNodes = getPublicNodes();

  // Fetch health for each node in parallel
  const healthResults = await Promise.allSettled(
    NODE_REGISTRY.map((n) => bffFetch(n.node_id, "/health"))
  );

  const nodes = publicNodes.map((node, i) => {
    const result = healthResults[i];
    const health =
      result.status === "fulfilled" ? (result.value as Record<string, unknown>) : null;
    return {
      ...node,
      status: health ? "healthy" : "unreachable",
      health: health ?? null,
    };
  });

  return NextResponse.json({ nodes });
}
