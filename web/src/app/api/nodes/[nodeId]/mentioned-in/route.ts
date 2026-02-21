import { NextRequest, NextResponse } from "next/server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId)) {
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });
  }

  const uri = req.nextUrl.searchParams.get("uri");
  if (!uri) {
    return NextResponse.json({ error: "Missing uri parameter" }, { status: 400 });
  }

  try {
    const data = await bffFetch(
      nodeId,
      `/entity/${encodeURIComponent(uri)}/mentioned-in`
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      return NextResponse.json(
        { error: "Upstream error", degraded: true },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: "Node unreachable", degraded: true },
      { status: 502 }
    );
  }
}
