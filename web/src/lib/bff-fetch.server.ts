// Server-only — hardened fetch with cache, timeout, and stale fallback
import "server-only";
import { getNode, getCommonsToken } from "./node-registry.server";

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

/** Build auth headers for commons admin endpoints (scoped to /koi-net/commons/*). */
function commonsHeaders(nodeId: string, base: Record<string, string> = {}): Record<string, string> {
  const token = getCommonsToken(nodeId);
  if (token) {
    return { ...base, Authorization: `Bearer ${token}` };
  }
  return base;
}

/** POST variant — no caching (chat/mutations are side effects). */
export async function bffPost(
  nodeId: string,
  path: string,
  body: unknown,
  timeoutMs = 30_000
): Promise<unknown> {
  const node = getNode(nodeId);
  if (!node) throw new Error("Unknown node");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const isCommons = path.startsWith("/koi-net/commons/");
  const headers = isCommons
    ? commonsHeaders(nodeId, { "Content-Type": "application/json" })
    : { "Content-Type": "application/json" };

  try {
    const res = await fetch(`${node.internal_url}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new BffUpstreamError(res.status);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function bffFetch(nodeId: string, path: string): Promise<unknown> {
  const node = getNode(nodeId);
  if (!node) throw new Error("Unknown node");

  const cacheKey = `${nodeId}:${path}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const isCommons = path.startsWith("/koi-net/commons/");
  const fetchOpts: RequestInit = { signal: controller.signal };
  if (isCommons) {
    fetchOpts.headers = commonsHeaders(nodeId);
  }

  try {
    const res = await fetch(`${node.internal_url}${path}`, fetchOpts);
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
