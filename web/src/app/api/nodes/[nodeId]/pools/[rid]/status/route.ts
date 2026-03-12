import { NextRequest, NextResponse } from "next/server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string; rid: string }> }
) {
  const { nodeId, rid } = await params;
  if (!getNode(nodeId))
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  try {
    const data = await bffFetch(
      nodeId,
      `/pools/${encodeURIComponent(rid)}/status`
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
