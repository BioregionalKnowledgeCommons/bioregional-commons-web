import { NextRequest, NextResponse } from "next/server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 10 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Server-side search cache (15s TTL)
const searchCache = new Map<string, { data: unknown; ts: number }>();
const SEARCH_CACHE_TTL = 15_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  if (!getNode(nodeId)) {
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const cacheKey = `${nodeId}:${q.trim().toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const raw = (await bffFetch(
      nodeId,
      `/entity-search?query=${encodeURIComponent(q.trim())}`
    )) as { results?: Array<Record<string, unknown>>; count?: number };

    // Normalize backend field names → frontend KoiSearchResult type
    const results = (raw.results ?? []).map((r) => ({
      uri: r.uri ?? r.fuseki_uri,
      label: r.name ?? r.label ?? "",
      entity_type: r.type ?? r.entity_type ?? "",
      score: r.similarity ?? r.score ?? 0,
      aliases: r.aliases ?? [],
      relationship_count: r.relationship_count,
      quartz_url: r.quartz_url,
    }));

    const normalized = { results, count: raw.count ?? results.length };
    searchCache.set(cacheKey, { data: normalized, ts: Date.now() });
    return NextResponse.json(normalized);
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
