import { NextRequest, NextResponse } from "next/server";
import { getNode } from "@/lib/node-registry.server";
import { bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";
import { requireSteward, AuthError } from "@/lib/auth/require-session.server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string; shareId: string }> }
) {
  const { nodeId, shareId } = await params;
  const node = getNode(nodeId);
  if (!node) return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  try {
    await requireSteward(nodeId);
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const data = await bffPost(
      nodeId,
      `/koi-net/commons/intake/${shareId}/resolve-merges`,
      body
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
