import { NextRequest, NextResponse } from "next/server";
import { bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId)) {
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body.message ?? body.query) as string | undefined;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  try {
    const data = await bffPost(nodeId, "/chat", {
      query: query.trim(),
      max_context_entities: 5,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      return NextResponse.json({ error: "Upstream error" }, { status: err.status });
    }
    return NextResponse.json({ error: "Node unreachable" }, { status: 502 });
  }
}
