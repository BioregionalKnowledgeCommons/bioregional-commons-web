import { NextRequest, NextResponse } from "next/server";
import { getNode } from "@/lib/node-registry.server";
import { bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";
import { requireSteward, AuthError } from "@/lib/auth/require-session.server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  const node = getNode(nodeId);
  if (!node) return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  try {
    await requireSteward(nodeId);
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url field required" }, { status: 400 });
  }

  try {
    // Use 90s timeout — LLM extraction can take up to 30s
    const data = await bffPost(nodeId, "/web/process", body, 90_000);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream error" }, { status: err.status });
    return NextResponse.json({ error: "Node unreachable" }, { status: 502 });
  }
}
