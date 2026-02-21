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
    const raw = (await bffFetch(
      nodeId,
      `/relationships/${encodeURIComponent(uri)}`
    )) as { relationships?: Array<Record<string, unknown>> };

    // Normalize backend field names → frontend KoiRelationship type
    const relationships = (raw.relationships ?? []).map((r) => ({
      subject_uri: r.subject_uri,
      subject_label: r.subject_name ?? r.subject_label ?? "",
      predicate: r.predicate,
      object_uri: r.object_uri,
      object_label: r.object_name ?? r.object_label ?? "",
      confidence: r.confidence,
      subject_type: r.subject_type,
      object_type: r.object_type,
    }));

    return NextResponse.json({ relationships });
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
