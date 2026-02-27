import { NextRequest, NextResponse } from "next/server";
import { getNode } from "@/lib/node-registry.server";
import { bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

const INGEST_TOKEN = process.env.BFF_INGEST_TOKEN;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  const node = getNode(nodeId);
  if (!node)
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });

  // Auth: require BFF_INGEST_TOKEN header (fail closed in production)
  if (!INGEST_TOKEN && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Ingest route disabled: BFF_INGEST_TOKEN not configured" },
      { status: 503 }
    );
  }
  if (INGEST_TOKEN) {
    const provided = request.headers.get("x-ingest-token");
    if (provided !== INGEST_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Require source tag to prevent accidental untagged writes
  if (!body.source) {
    return NextResponse.json(
      { error: "source field required for BFF ingest" },
      { status: 400 }
    );
  }

  try {
    const data = await bffPost(nodeId, "/ingest", body);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError)
      return NextResponse.json({ error: "upstream" }, { status: err.status });
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
