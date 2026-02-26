import { NextRequest, NextResponse } from "next/server";
import { NODE_REGISTRY } from "@/lib/node-registry.server";
import { bffPost } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const query = body.message || body.query;
  if (!query) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  // Fan out to all nodes in parallel
  const results = await Promise.allSettled(
    NODE_REGISTRY.map(async (node) => {
      const data = await bffPost(
        node.node_id,
        "/chat",
        { query, max_context_entities: 3 },
        30_000
      );
      return {
        node_id: node.node_id,
        display_name: node.display_name,
        ...(data as Record<string, unknown>),
      };
    })
  );

  const responses = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<Record<string, unknown>>).value);

  if (responses.length === 0) {
    return NextResponse.json({ error: "No nodes responded" }, { status: 502 });
  }

  // Collect all sources from all nodes, tagged with origin
  const allSources = responses.flatMap((r) =>
    (Array.isArray(r.sources) ? r.sources : []).map((s: unknown) => ({
      ...(s as Record<string, unknown>),
      source_node: r.node_id,
      source_name: r.display_name,
    }))
  );

  // Pick the best response — longest answer as a simple heuristic
  const best = responses.reduce((a, b) =>
    (String(a.answer ?? "").length >= String(b.answer ?? "").length) ? a : b
  );

  return NextResponse.json({
    answer: best.answer,
    sources: allSources,
    intent: best.intent,
    respondingNode: best.node_id,
    respondingNodeName: best.display_name,
    node_responses: responses.map((r) => ({
      node_id: r.node_id,
      display_name: r.display_name,
      answer: r.answer,
      source_count: Array.isArray(r.sources) ? r.sources.length : 0,
    })),
  });
}
