import { NextRequest, NextResponse } from "next/server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";
import type { KoiRelationship } from "@/types";

export const dynamic = "force-dynamic";

const MAX_DEPTH = 2;
const MAX_NODES = 50;
const FETCH_TIMEOUT = 8_000;

interface SubgraphNode {
  uri: string;
  label: string;
  type: string;
}

interface SubgraphEdge {
  source: string;
  target: string;
  predicate: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId)) {
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });
  }

  const seedUri = req.nextUrl.searchParams.get("uri");
  if (!seedUri) {
    return NextResponse.json({ error: "Missing uri parameter" }, { status: 400 });
  }

  const depth = Math.min(
    parseInt(req.nextUrl.searchParams.get("depth") ?? "2", 10),
    MAX_DEPTH
  );

  try {
    const nodes = new Map<string, SubgraphNode>();
    const edges: SubgraphEdge[] = [];
    const visited = new Set<string>();
    const queue: { uri: string; currentDepth: number }[] = [
      { uri: seedUri, currentDepth: 0 },
    ];

    // Add seed node
    const seedLabel = seedUri.split("/").pop() ?? seedUri;
    nodes.set(seedUri, { uri: seedUri, label: seedLabel, type: "unknown" });

    while (queue.length > 0 && nodes.size < MAX_NODES) {
      const { uri, currentDepth } = queue.shift()!;
      if (visited.has(uri)) continue;
      visited.add(uri);

      if (currentDepth > depth) continue;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        const raw = (await bffFetch(
          nodeId,
          `/relationships?uri=${encodeURIComponent(uri)}`
        )) as { relationships?: KoiRelationship[] };
        clearTimeout(timer);

        const rels = raw.relationships ?? [];
        for (const rel of rels) {
          if (nodes.size >= MAX_NODES) break;

          // Add subject node
          if (!nodes.has(rel.subject_uri)) {
            nodes.set(rel.subject_uri, {
              uri: rel.subject_uri,
              label: rel.subject_label,
              type: "entity",
            });
          }

          // Add object node
          if (!nodes.has(rel.object_uri)) {
            nodes.set(rel.object_uri, {
              uri: rel.object_uri,
              label: rel.object_label,
              type: "entity",
            });
          }

          edges.push({
            source: rel.subject_uri,
            target: rel.object_uri,
            predicate: rel.predicate,
          });

          // Queue neighbors for BFS
          if (currentDepth < depth) {
            if (!visited.has(rel.subject_uri)) {
              queue.push({ uri: rel.subject_uri, currentDepth: currentDepth + 1 });
            }
            if (!visited.has(rel.object_uri)) {
              queue.push({ uri: rel.object_uri, currentDepth: currentDepth + 1 });
            }
          }
        }
      } catch {
        // Skip unreachable relationships, continue BFS
        continue;
      }
    }

    return NextResponse.json({
      nodes: Array.from(nodes.values()),
      edges,
    });
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      return NextResponse.json({ error: "Upstream error" }, { status: err.status });
    }
    return NextResponse.json({ error: "Node unreachable" }, { status: 502 });
  }
}
