// Server-only — hardened fetch with cache, timeout, and stale fallback
import "server-only";
import { getNode } from "./node-registry.server";

const TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 30_000;

/** Thrown when the upstream KOI node returns a non-ok HTTP status. */
export class BffUpstreamError extends Error {
  constructor(public readonly status: number) {
    super(`Upstream returned ${status}`);
    this.name = "BffUpstreamError";
  }
}

interface CacheEntry {
  data: unknown;
  ts: number;
}

const cache = new Map<string, CacheEntry>();

export async function bffFetch(nodeId: string, path: string): Promise<unknown> {
  const node = getNode(nodeId);
  if (!node) throw new Error("Unknown node");

  const cacheKey = `${nodeId}:${path}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${node.internal_url}${path}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new BffUpstreamError(res.status);
    const data = await res.json();
    cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err) {
    // Return stale cache if available
    if (cached) return cached.data;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
