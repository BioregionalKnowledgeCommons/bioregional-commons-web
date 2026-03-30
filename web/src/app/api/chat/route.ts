import { NextRequest, NextResponse } from "next/server";
import { NODE_REGISTRY } from "@/lib/node-registry.server";
import { bffPost } from "@/lib/bff-fetch.server";
import { detectRoadmapIntent, translateNLtoDSL, summarizeResults, validateDSL } from "@/lib/roadmap-dsl";
import { executeDSL } from "@/lib/roadmap-index.server";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Roadmap-aware chat path
// ---------------------------------------------------------------------------

async function handleRoadmapQuery(query: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null; // fall through to KOI nodes

  // Translate NL → DSL
  const dsl = await translateNLtoDSL(query, apiKey);
  if (!dsl) return null; // translation failed → fall through

  // Validate
  const validation = validateDSL(dsl);
  if (!validation.valid) return null;

  // Execute against in-memory index
  let results: unknown;
  try {
    results = executeDSL(validation.dsl);
  } catch {
    return null; // execution failed → fall through
  }

  // Summarize via LLM
  const answer = await summarizeResults(query, results, apiKey);

  // Build sources from roadmap nodes in results
  const sources: Array<Record<string, unknown>> = [];
  const extractNodes = (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const d = data as Record<string, unknown>;

    // Direct node array (from filter)
    if (Array.isArray(data)) {
      for (const node of data) {
        if (node && typeof node === 'object' && 'id' in node) {
          sources.push({
            uri: `roadmap:${(node as { id: string }).id}`,
            title: (node as { title?: string }).title ?? (node as { id: string }).id,
            source_node: 'roadmap',
            source_name: 'Semantic Roadmap',
          });
        }
      }
    }

    // Nested nodes array (from walk results)
    if ('nodes' in d && Array.isArray(d.nodes)) {
      for (const node of d.nodes) {
        if (node && typeof node === 'object' && 'id' in node) {
          sources.push({
            uri: `roadmap:${(node as { id: string }).id}`,
            title: (node as { title?: string }).title ?? (node as { id: string }).id,
            source_node: 'roadmap',
            source_name: 'Semantic Roadmap',
          });
        }
      }
    }

    // Path results (from path operation — path contains enriched node objects)
    if ('path' in d && Array.isArray(d.path)) {
      for (const node of d.path) {
        if (node && typeof node === 'object' && 'id' in node) {
          sources.push({
            uri: `roadmap:${(node as { id: string }).id}`,
            title: (node as { title?: string }).title ?? (node as { id: string }).id,
            source_node: 'roadmap',
            source_name: 'Semantic Roadmap',
          });
        }
      }
    }
  };
  extractNodes(results);

  return {
    answer,
    sources,
    intent: 'roadmap',
    respondingNode: 'roadmap',
    respondingNodeName: 'Semantic Roadmap',
    dsl: validation.dsl,
    selection_rationale: 'Roadmap intent detected — answered via deterministic query + LLM summary',
  };
}

// ---------------------------------------------------------------------------
// Standard KOI node fan-out path
// ---------------------------------------------------------------------------

async function handleKOIQuery(query: string) {
  const results = await Promise.allSettled(
    NODE_REGISTRY.map(async (node) => {
      const data = await bffPost(
        node.node_id,
        "/chat",
        { query, max_context_entities: 3, planner: true },
        30_000
      );
      return {
        node_id: node.node_id,
        display_name: node.display_name,
        ...(data as Record<string, unknown>),
      };
    })
  );

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
    return null;
  }

  const allSources = responses.flatMap((r) =>
    (Array.isArray(r.sources) ? r.sources : []).map((s: unknown) => ({
      ...(s as Record<string, unknown>),
      source_node: r.node_id,
      source_name: r.display_name,
    }))
  );

  const score = (r: Record<string, unknown>) =>
    String(r.answer ?? "").length * 0.7 +
    (Array.isArray(r.sources) ? r.sources.length : 0) * 30;
  const best = responses.reduce((a, b) => score(a) >= score(b) ? a : b);

  return {
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
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.json();
  const query = body.message || body.query;
  if (!query) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  // Check for roadmap intent first
  if (detectRoadmapIntent(query)) {
    const roadmapResult = await handleRoadmapQuery(query);
    if (roadmapResult) {
      return NextResponse.json(roadmapResult);
    }
    // Fall through to KOI nodes if roadmap query failed
  }

  // Standard KOI node fan-out
  const koiResult = await handleKOIQuery(query);
  if (!koiResult) {
    return NextResponse.json({ error: "No nodes responded" }, { status: 502 });
  }

  return NextResponse.json(koiResult);
}
