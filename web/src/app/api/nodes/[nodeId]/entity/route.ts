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
      `/entity/${encodeURIComponent(uri)}`
    )) as { entity?: Record<string, unknown>; documents?: unknown[]; detail?: string };

    // Backend may return 404 as { detail: "Entity not found" }
    if (raw.detail === "Entity not found" || !raw.entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    const e = raw.entity;
    // Normalize backend field names → frontend KoiEntity type
    return NextResponse.json({
      uri: e.fuseki_uri ?? e.uri,
      label: e.entity_text ?? e.label ?? "",
      entity_type: e.entity_type ?? "",
      description: e.metadata && typeof e.metadata === "object"
        ? (e.metadata as Record<string, unknown>).description ?? null
        : null,
      aliases: e.aliases ?? [],
      created_at: e.created_at,
      koi_rid: e.koi_rid,
      source: e.source,
      normalized_text: e.normalized_text,
      documents: raw.documents ?? [],
    });
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      if (err.status === 404) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
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
