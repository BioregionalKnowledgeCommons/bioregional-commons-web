import { NextRequest, NextResponse } from "next/server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get("node_id") || "octo-salish-sea";
  const limit = request.nextUrl.searchParams.get("limit") || "50";
  const offset = request.nextUrl.searchParams.get("offset") || "0";

  try {
    const data = await bffFetch(
      nodeId,
      `/claims/settlements?limit=${limit}&offset=${offset}`
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
      { error: "Failed to fetch settlements" },
      { status: 502 }
    );
  }
}
