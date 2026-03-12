import { NextRequest, NextResponse } from "next/server";
import { bffFetch, bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId))
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  // There's no pool listing endpoint yet, so we fetch individual pools
  // For now, return empty — pool RIDs are known from seed data or commitments
  return NextResponse.json({ pools: [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId))
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  try {
    const body = await request.json();
    const data = await bffPost(nodeId, "/pools/create", body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
