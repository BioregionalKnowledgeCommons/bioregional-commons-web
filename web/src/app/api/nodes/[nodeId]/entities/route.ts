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

  const entity_type = req.nextUrl.searchParams.get("entity_type") ?? "";
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  const offset = req.nextUrl.searchParams.get("offset") ?? "0";

  const qs = new URLSearchParams();
  if (entity_type) qs.set("entity_type", entity_type);
  qs.set("limit", limit);
  qs.set("offset", offset);

  try {
    const raw = (await bffFetch(nodeId, `/entities?${qs.toString()}`)) as {
      entities: Array<Record<string, unknown>>;
      count?: number;
    };
    // Normalize backend field names → frontend types
    const entities = (raw.entities ?? []).map((e) => ({
      uri: e.fuseki_uri ?? e.uri,
      label: e.entity_text ?? e.label ?? "",
      entity_type: e.entity_type ?? "",
      source: e.source,
      created_at: e.created_at,
      koi_rid: e.koi_rid,
    }));
    return NextResponse.json({
      entities,
      total: raw.count ?? entities.length,
    });
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      return NextResponse.json(
        { error: `Upstream error`, degraded: true },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: "Node unreachable", degraded: true },
      { status: 502 }
    );
  }
}
