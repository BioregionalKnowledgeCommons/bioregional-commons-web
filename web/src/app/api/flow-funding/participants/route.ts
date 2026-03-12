import { NextRequest, NextResponse } from "next/server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get("node_id") || "octo-salish-sea";

  try {
    const data = await bffFetch(
      nodeId,
      "/entities?entity_type=Organization&limit=100"
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      return NextResponse.json(
        { error: "Upstream error", status: err.status },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 502 }
    );
  }
}
