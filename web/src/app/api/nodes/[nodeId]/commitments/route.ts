import { NextRequest, NextResponse } from "next/server";
import { bffFetch, bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId))
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  const qs = new URLSearchParams();
  const state = req.nextUrl.searchParams.get("state");
  const pledger_uri = req.nextUrl.searchParams.get("pledger_uri");
  const pool_rid = req.nextUrl.searchParams.get("pool_rid");
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  const offset = req.nextUrl.searchParams.get("offset") ?? "0";

  if (state) qs.set("state", state);
  if (pledger_uri) qs.set("pledger_uri", pledger_uri);
  if (pool_rid) qs.set("pool_rid", pool_rid);
  qs.set("limit", limit);
  qs.set("offset", offset);

  try {
    const data = await bffFetch(nodeId, `/commitments/?${qs.toString()}`);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
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
    const data = await bffPost(nodeId, "/commitments/create", body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
