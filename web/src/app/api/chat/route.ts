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

  // Pair each result with its node for error reporting
  const nodeResults = results.map((r, i) => ({
    node: NODE_REGISTRY[i],
    result: r,
  }));

  const responses: Record<string, unknown>[] = nodeResults
    .filter((nr) => nr.result.status === "fulfilled")
    .map((nr) => ({
      node_id: nr.node.node_id,
      display_name: nr.node.display_name,
      ...(nr.result as PromiseFulfilledResult<Record<string, unknown>>).value,
    }));

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

  // Pick the best response — weight answer length (70%) + source count (30pts each)
  const score = (r: Record<string, unknown>) =>
    String(r.answer ?? "").length * 0.7 +
    (Array.isArray(r.sources) ? r.sources.length : 0) * 30;
  const best = responses.reduce((a, b) => score(a) >= score(b) ? a : b);

  return NextResponse.json({
    answer: best.answer,
    sources: allSources,
    intent: best.intent,
    respondingNode: best.node_id,
    respondingNodeName: best.display_name,
    selection_rationale: `${best.display_name} had best answer (score ${score(best).toFixed(0)}: ${Array.isArray(best.sources) ? best.sources.length : 0} sources)`,
    node_responses: nodeResults.map((nr) => {
      if (nr.result.status === "fulfilled") {
        const v = nr.result.value as Record<string, unknown>;
        return {
          node_id: nr.node.node_id,
          display_name: nr.node.display_name,
          answer: v.answer,
          source_count: Array.isArray(v.sources) ? v.sources.length : 0,
        };
      }
      return {
        node_id: nr.node.node_id,
        display_name: nr.node.display_name,
        answer: null,
        source_count: 0,
        error: (nr.result.reason as Error)?.message ?? "unavailable",
      };
    }),
  });
}
