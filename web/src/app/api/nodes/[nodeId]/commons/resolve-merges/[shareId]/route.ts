import { NextRequest, NextResponse } from "next/server";
import { getNode } from "@/lib/node-registry.server";
import { bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string; shareId: string }> }
) {
  const { nodeId, shareId } = await params;
  const node = getNode(nodeId);
  if (!node) return NextResponse.json({ error: "Unknown node" }, { status: 404 });

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
