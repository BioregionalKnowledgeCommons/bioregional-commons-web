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

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
  }

  try {
    const data = await bffFetch(nodeId, `/query?q=${encodeURIComponent(q.trim())}`);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      return NextResponse.json({ error: "Upstream error" }, { status: err.status });
    }
    return NextResponse.json({ error: "Node unreachable" }, { status: 502 });
  }
}
