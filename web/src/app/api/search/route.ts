import { NextRequest, NextResponse } from "next/server";
import { NODE_REGISTRY } from "@/lib/node-registry.server";
import { bffFetch, BffUpstreamError } from "@/lib/bff-fetch.server";

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

// Server-side search cache (15s TTL, keyed by query)
const globalSearchCache = new Map<string, { data: unknown; ts: number }>();
const SEARCH_CACHE_TTL = 15_000;

interface RawResult {
  uri?: string;
  fuseki_uri?: string;
  name?: string;
  label?: string;
  type?: string;
  entity_type?: string;
  similarity?: number;
  score?: number;
  aliases?: string[];
  relationship_count?: number;
  quartz_url?: string;
  [key: string]: unknown;
}

interface NormalizedResult {
  uri: string;
  label: string;
  entity_type: string;
  score: number;
  aliases: string[];
  relationship_count?: number;
  quartz_url?: string;
  source_node: string;
  source_name: string;
}

function normalizeResult(
  r: RawResult,
  nodeId: string,
  displayName: string
): NormalizedResult {
  return {
    uri: (r.uri ?? r.fuseki_uri ?? "") as string,
    label: (r.name ?? r.label ?? "") as string,
    entity_type: (r.type ?? r.entity_type ?? "") as string,
    score: (r.similarity ?? r.score ?? 0) as number,
    aliases: (r.aliases ?? []) as string[],
    relationship_count: r.relationship_count as number | undefined,
    quartz_url: r.quartz_url as string | undefined,
    source_node: nodeId,
    source_name: displayName,
  };
}

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { results: [], count: 0, error: "Query too short (minimum 2 characters)" },
      { status: 400 }
    );
  }

  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "20", 10), 1),
    100
  );

  const trimmed = q.trim();
  const cacheKey = `global:${trimmed.toLowerCase()}:${limit}`;
  const cached = globalSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // Only query nodes that support search
  const searchableNodes = NODE_REGISTRY.filter(
    (n) => n.capabilities.supports_search
  );

  // Fan out to all nodes in parallel
  const settled = await Promise.allSettled(
    searchableNodes.map(async (node) => {
      let raw: { results?: RawResult[]; count?: number };
      try {
        raw = (await bffFetch(
          node.node_id,
          `/entity-search?query=${encodeURIComponent(trimmed)}`
        )) as { results?: RawResult[]; count?: number };
      } catch (err) {
        if (err instanceof BffUpstreamError && err.status === 404) {
          // Fallback: node hasn't been redeployed yet, use /entities + client filter
          const fallback = (await bffFetch(node.node_id, `/entities?limit=20`)) as {
            entities?: RawResult[];
          };
          if (fallback.entities) {
            const q = trimmed.toLowerCase();
            raw = {
              results: fallback.entities
                .filter(
                  (e) =>
                    (e.entity_text as string | undefined)
                      ?.toLowerCase()
                      .includes(q)
                )
                .map((e) => ({
                  ...e,
                  name: e.entity_text as string,
                  similarity: 1.0,
                })),
              count: 0,
            };
            raw.count = raw.results?.length ?? 0;
          } else {
            raw = { results: [], count: 0 };
          }
        } else {
          throw err;
        }
      }
      return {
        node_id: node.node_id,
        display_name: node.display_name,
        results: raw.results ?? [],
      };
    })
  );

  // Merge results, keeping highest score per URI
  const merged = new Map<string, NormalizedResult>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.results) {
      const normalized = normalizeResult(
        item,
        result.value.node_id,
        result.value.display_name
      );
      const key = normalized.uri;
      if (!key) continue;
      const existing = merged.get(key);
      if (!existing || normalized.score > existing.score) {
        merged.set(key, normalized);
      }
    }
  }

  // Sort by score descending, apply limit
  const sorted = Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const nodesResponded = settled.filter(
    (r) => r.status === "fulfilled"
  ).length;

  const payload = {
    results: sorted,
    count: sorted.length,
    nodes_queried: searchableNodes.length,
    nodes_responded: nodesResponded,
  };

  globalSearchCache.set(cacheKey, { data: payload, ts: Date.now() });
  return NextResponse.json(payload);
}
