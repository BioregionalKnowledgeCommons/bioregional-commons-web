import { NextRequest, NextResponse } from "next/server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId))
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  const label = req.nextUrl.searchParams.get("label");
  const entityType = req.nextUrl.searchParams.get("entity_type");
  if (!label)
    return NextResponse.json({ error: "label required" }, { status: 400 });

  const qs = new URLSearchParams({ label });
  if (entityType) qs.set("entity_type", entityType);

  try {
    const data = await bffFetch(nodeId, `/entity/resolve?${qs.toString()}`);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
