import { NextRequest, NextResponse } from "next/server";
import { bffFetch, bffPost, BffUpstreamError } from "@/lib/bff-fetch.server";
import { getNode } from "@/lib/node-registry.server";
import type { Commitment } from "@/hooks/useCommitments";
import type { Pool } from "@/hooks/usePools";
import type { PoolStatus } from "@/hooks/usePoolStatus";
import type { ScoreBreakdown, PoolSuggestion } from "@/hooks/useCommitmentRouting";

export const dynamic = "force-dynamic";

interface RoutingPool {
  pool_rid: string;
  name: string;
  state: string;
  bioregion_uri: string | null;
  need_tags: string[];
  capacity_usd: number | null;
  remaining_capacity_usd: number | null;
  total_pledges: number;
  verified_pledges: number;
  threshold_pct_current: number;
}

interface RoutingEdge {
  commitment_rid: string;
  commitment_title: string;
  pool_rid: string;
  pool_name: string;
  total_score: number;
  score_breakdown: ScoreBreakdown;
  hard_excludes: string[];
  recommended: boolean;
  explanation: string;
}

interface RoutingOverviewResponse {
  commitments: Commitment[];
  pools: RoutingPool[];
  routingEdges: RoutingEdge[];
}

// Route-local aggregate cache (30s TTL)
const overviewCache = new Map<string, { data: RoutingOverviewResponse; ts: number }>();
const CACHE_TTL_MS = 30_000;

// Bounded concurrency helper
async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;

  async function next(): Promise<void> {
    const idx = i++;
    if (idx >= items.length) return;
    results[idx] = await fn(items[idx]);
    return next();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

const ROUTABLE_STATES = new Set(["PROPOSED", "VERIFIED"]);

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get("node_id") || "octo-salish-sea";

  if (!getNode(nodeId)) {
    return NextResponse.json({ error: "Unknown node" }, { status: 404 });
  }

  // Check cache
  const cached = overviewCache.get(nodeId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    // Step 1+2: Fetch commitments + pools in parallel
    const [commitmentsRaw, formingPoolsRaw, activePoolsRaw] = await Promise.all([
      bffFetch(nodeId, "/commitments/?limit=200") as Promise<Commitment[]>,
      bffFetch(nodeId, "/pools/?state=forming") as Promise<Pool[]>,
      bffFetch(nodeId, "/pools/?state=active") as Promise<Pool[]>,
    ]);

    const commitments = commitmentsRaw || [];
    const allPools = [...(formingPoolsRaw || []), ...(activePoolsRaw || [])];

    // Step 3: Fetch pool statuses in parallel
    const poolStatuses = await Promise.all(
      allPools.map(async (pool) => {
        try {
          return await bffFetch(
            nodeId,
            `/pools/${encodeURIComponent(pool.pool_rid)}/status`
          ) as PoolStatus;
        } catch {
          return null;
        }
      })
    );

    // Enrich pools with status data
    const pools: RoutingPool[] = allPools.map((pool, i) => {
      const status = poolStatuses[i];
      return {
        pool_rid: pool.pool_rid,
        name: pool.name,
        state: pool.state,
        bioregion_uri: pool.bioregion_uri,
        need_tags: pool.metadata?.need_tags || [],
        capacity_usd: pool.metadata?.capacity_usd ?? null,
        remaining_capacity_usd: pool.metadata?.remaining_capacity_usd ?? null,
        total_pledges: status?.total_pledges ?? 0,
        verified_pledges: status?.verified_pledges ?? 0,
        threshold_pct_current: status?.threshold_pct_current ?? 0,
      };
    });

    // Step 4+5: Score routable commitments
    const routableCommitments = commitments.filter((c) =>
      ROUTABLE_STATES.has(c.state)
    );

    const routingEdges: RoutingEdge[] = [];

    await mapWithConcurrency(
      routableCommitments,
      async (commitment) => {
        try {
          const draft = {
            pledger_uri: commitment.pledger_uri,
            title: commitment.title,
            offer_type: commitment.offer_type,
            quantity: commitment.quantity ?? undefined,
            unit: commitment.unit ?? undefined,
            validity_start: commitment.validity_start ?? undefined,
            validity_end: commitment.validity_end ?? undefined,
            metadata: commitment.metadata,
          };
          const result = (await bffPost(
            nodeId,
            "/commitments/routing-suggestions",
            draft
          )) as { suggestions: PoolSuggestion[] };

          if (result?.suggestions) {
            for (const suggestion of result.suggestions) {
              if (suggestion.total_score > 0 || suggestion.hard_excludes.length > 0) {
                routingEdges.push({
                  commitment_rid: commitment.commitment_rid,
                  commitment_title: commitment.title,
                  pool_rid: suggestion.pool_rid,
                  pool_name: suggestion.pool_name,
                  total_score: suggestion.total_score,
                  score_breakdown: suggestion.score_breakdown,
                  hard_excludes: suggestion.hard_excludes,
                  recommended: suggestion.recommended,
                  explanation: suggestion.explanation,
                });
              }
            }
          }
        } catch {
          // Skip commitments that fail scoring
        }
      },
      5 // max 5 concurrent
    );

    // Sort edges for stable ordering across refetches
    routingEdges.sort((a, b) =>
      a.commitment_rid < b.commitment_rid ? -1
        : a.commitment_rid > b.commitment_rid ? 1
          : a.pool_rid < b.pool_rid ? -1
            : a.pool_rid > b.pool_rid ? 1
              : 0
    );

    const response: RoutingOverviewResponse = {
      commitments,
      pools,
      routingEdges,
    };

    // Cache the response
    overviewCache.set(nodeId, { data: response, ts: Date.now() });

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof BffUpstreamError) {
      return NextResponse.json(
        { error: "Upstream error", status: err.status },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch routing overview" },
      { status: 502 }
    );
  }
}
