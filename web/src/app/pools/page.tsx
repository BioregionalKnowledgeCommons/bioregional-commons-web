"use client";

import Link from "next/link";
import { useState } from "react";
import { usePools, type Pool } from "@/hooks/usePools";
import { usePoolStatus } from "@/hooks/usePoolStatus";
import UserMenu from "@/components/auth/UserMenu";

const NODE_ID = "octo-salish-sea";

const POOL_STATE_COLORS: Record<string, string> = {
  forming: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  active: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
};

function PoolStateBadge({ state }: { state: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs border ${POOL_STATE_COLORS[state] || "bg-gray-800 text-gray-400 border-gray-700"}`}
    >
      {state}
    </span>
  );
}

function extractBioregionSlug(uri: string): string {
  // Extract last segment from URI like "orn:..." or a path
  const parts = uri.split(/[/:]/);
  return parts[parts.length - 1] || uri;
}

function ThresholdBar({
  current,
  required,
}: {
  current: number;
  required: number;
}) {
  const pct = required > 0 ? Math.min((current / required) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Threshold progress</span>
        <span>
          {current}% / {required}%
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PoolCard({ pool }: { pool: Pool }) {
  const { data: status } = usePoolStatus(NODE_ID, pool.pool_rid);
  const meta = pool.metadata || {};

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-sm text-white">{pool.name}</h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {pool.pool_rid}
          </p>
        </div>
        <PoolStateBadge state={pool.state} />
      </div>

      {/* Description */}
      {pool.description && (
        <p className="text-sm text-gray-400">{pool.description}</p>
      )}

      {/* Bioregion */}
      {pool.bioregion_uri && (
        <p className="text-xs text-gray-500">
          <span className="text-gray-600">Bioregion:</span>{" "}
          <span title={pool.bioregion_uri}>
            {extractBioregionSlug(pool.bioregion_uri)}
          </span>
        </p>
      )}

      {/* Threshold progress */}
      {status && (
        <ThresholdBar
          current={status.threshold_pct_current}
          required={status.threshold_pct_required}
        />
      )}

      {/* Pledge summary */}
      {status && (
        <p className="text-xs text-gray-400">
          {status.total_pledges} pledge{status.total_pledges !== 1 ? "s" : ""} (
          {status.verified_pledges} verified)
        </p>
      )}

      {/* Need tags */}
      {meta.need_tags && meta.need_tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {meta.need_tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-blue-900/30 border border-blue-800 rounded text-xs text-blue-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Capacity */}
      <p className="text-xs text-gray-500">
        {meta.capacity_usd != null ? (
          <>
            ${(meta.remaining_capacity_usd ?? meta.capacity_usd).toLocaleString()}{" "}
            remaining of ${meta.capacity_usd.toLocaleString()}
          </>
        ) : (
          "Capacity not set"
        )}
      </p>

      {/* View commitments link */}
      <Link
        href={`/commitments?pool_rid=${encodeURIComponent(pool.pool_rid)}`}
        title="View commitments pledged to this pool"
        className="inline-block text-xs text-blue-400 hover:text-blue-300 hover:underline"
      >
        View commitments &rarr;
      </Link>
    </div>
  );
}

export default function PoolsPage() {
  const [stateFilter, setStateFilter] = useState<string>("");
  const {
    data: pools,
    isLoading,
    error,
  } = usePools(NODE_ID, { state: stateFilter || undefined });

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto fixed inset-0">
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="https://salishsee.life"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            &larr; Knowledge Garden
          </Link>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex-1">
            <h1 className="text-base font-semibold">Commitment Pools</h1>
            <p className="text-xs text-gray-500">
              Steward-curated containers for aggregating commitments
            </p>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* State filters */}
        <div className="flex gap-2 mb-6">
          {(
            [
              { value: "", tip: "Show all pools regardless of state" },
              { value: "forming", tip: "Pools gathering pledges before activation" },
              { value: "active", tip: "Pools that have met their activation threshold" },
            ] as const
          ).map((f) => (
            <button
              key={f.value}
              onClick={() => setStateFilter(f.value)}
              title={f.tip}
              className={`px-3 py-1 rounded text-xs ${
                stateFilter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f.value || "All"}
            </button>
          ))}
        </div>

        {isLoading && (
          <p className="text-gray-500 text-sm">Loading pools...</p>
        )}
        {error && (
          <p className="text-red-400 text-sm">
            Error loading pools: {(error as Error).message}
          </p>
        )}

        <div className="space-y-3">
          {pools?.map((pool) => (
            <PoolCard key={pool.pool_rid} pool={pool} />
          ))}
          {pools?.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No pools found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
