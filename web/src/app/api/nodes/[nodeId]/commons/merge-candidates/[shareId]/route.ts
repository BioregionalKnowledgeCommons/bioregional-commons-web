import { NextRequest, NextResponse } from "next/server";
import { getNode } from "@/lib/node-registry.server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nodeId: string; shareId: string }> }
) {
  const { nodeId, shareId } = await params;
  const node = getNode(nodeId);
  if (!node) return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  try {
    const data = await bffFetch(nodeId, `/koi-net/commons/intake/${shareId}/merge-candidates`);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
