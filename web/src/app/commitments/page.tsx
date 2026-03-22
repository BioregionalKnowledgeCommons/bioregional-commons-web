"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCommitments, type Commitment } from "@/hooks/useCommitments";
import {
  useCommitmentRouting,
  type PoolSuggestion,
} from "@/hooks/useCommitmentRouting";
import { usePledgeToPool, useTransitionState } from "@/hooks/usePools";
import UserMenu from "@/components/auth/UserMenu";

const NODE_ID = "octo-salish-sea";

const STATE_COLORS: Record<string, string> = {
  PROPOSED: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  VERIFIED: "bg-blue-900/50 text-blue-300 border-blue-700",
  ACTIVE: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  EVIDENCE_LINKED: "bg-purple-900/50 text-purple-300 border-purple-700",
  REDEEMED: "bg-gray-800 text-gray-300 border-gray-600",
  REJECTED: "bg-red-900/50 text-red-300 border-red-700",
  WITHDRAWN: "bg-gray-800 text-gray-500 border-gray-700",
};

function StateBadge({ state }: { state: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs border ${STATE_COLORS[state] || "bg-gray-800 text-gray-400 border-gray-700"}`}
    >
      {state}
    </span>
  );
}

function CommitmentCard({
  commitment,
  onShowRouting,
}: {
  commitment: Commitment;
  onShowRouting: (c: Commitment) => void;
}) {
  const pledgeMutation = usePledgeToPool(NODE_ID);
  const transitionMutation = useTransitionState(NODE_ID);
  const [pledgePoolRid, setPledgePoolRid] = useState("");

  const meta = commitment.metadata || {};

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-sm text-white">{commitment.title}</h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {commitment.commitment_rid}
          </p>
        </div>
        <StateBadge state={commitment.state} />
      </div>

      {commitment.description && (
        <p className="text-sm text-gray-400 mb-2">{commitment.description}</p>
      )}

      <div className="flex gap-4 text-xs text-gray-500 mb-3">
        <span>
          {commitment.offer_type}
          {commitment.quantity
            ? ` | ${commitment.quantity} ${commitment.unit || ""}`
            : ""}
        </span>
        {meta.estimated_value_usd && (
          <span>${meta.estimated_value_usd.toLocaleString()}</span>
        )}
        {commitment.validity_start && (
          <span>
            {new Date(commitment.validity_start).toLocaleDateString()} &ndash;{" "}
            {commitment.validity_end
              ? new Date(commitment.validity_end).toLocaleDateString()
              : "open"}
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {meta.wants?.map((w) => (
          <span
            key={w}
            className="px-2 py-0.5 bg-blue-900/30 border border-blue-800 rounded text-xs text-blue-300"
          >
            wants: {w}
          </span>
        ))}
        {meta.limits?.map((l) => (
          <span
            key={l}
            className="px-2 py-0.5 bg-orange-900/30 border border-orange-800 rounded text-xs text-orange-300"
          >
            limit: {l}
          </span>
        ))}
        {meta.routing_tags?.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300"
          >
            {t}
          </span>
        ))}
      </div>

      {commitment.pool_rid && (
        <p className="text-xs text-emerald-500 mb-2">
          Pledged to pool: {commitment.pool_rid}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!commitment.pool_rid && (
          <button
            onClick={() => onShowRouting(commitment)}
            title="Find which pools this commitment matches and see routing scores"
            className="px-3 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600"
          >
            Check Routes
          </button>
        )}

        {commitment.state === "PROPOSED" && !commitment.pool_rid && (
          <div className="flex gap-1">
            <input
              value={pledgePoolRid}
              onChange={(e) => setPledgePoolRid(e.target.value)}
              placeholder="Pool RID to pledge into"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-48 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() =>
                pledgeMutation.mutate({
                  poolRid: pledgePoolRid,
                  commitmentRid: commitment.commitment_rid,
                })
              }
              disabled={!pledgePoolRid || pledgeMutation.isPending}
              title="Assign this commitment to the specified pool"
              className="px-3 py-1 bg-emerald-700 rounded text-xs hover:bg-emerald-600 disabled:opacity-50"
            >
              Pledge
            </button>
          </div>
        )}

        {commitment.state === "PROPOSED" && (
          <button
            onClick={() =>
              transitionMutation.mutate({
                rid: commitment.commitment_rid,
                newState: "VERIFIED",
                reason: "steward verification",
              })
            }
            disabled={transitionMutation.isPending}
            title="Advance this commitment from PROPOSED to VERIFIED as a steward"
            className="px-3 py-1 bg-blue-700 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
          >
            Verify
          </button>
        )}
      </div>

      {(pledgeMutation.isError || transitionMutation.isError) && (
        <p className="text-red-400 text-xs mt-2">
          {pledgeMutation.error?.message || transitionMutation.error?.message}
        </p>
      )}
    </div>
  );
}

export default function CommitmentsPage() {
  return (
    <Suspense>
      <CommitmentsContent />
    </Suspense>
  );
}

function CommitmentsContent() {
  const searchParams = useSearchParams();
  const poolRidParam = searchParams.get("pool_rid") || undefined;
  const [stateFilter, setStateFilter] = useState<string>("");
  const { data: commitments, isLoading, error } = useCommitments(NODE_ID, {
    state: stateFilter || undefined,
    pool_rid: poolRidParam,
  });

  const routingMutation = useCommitmentRouting(NODE_ID);
  const [routingSuggestions, setRoutingSuggestions] = useState<{
    rid: string;
    suggestions: PoolSuggestion[];
  } | null>(null);

  const [routingError, setRoutingError] = useState<string | null>(null);

  async function handleShowRouting(c: Commitment) {
    setRoutingError(null);
    try {
      const result = await routingMutation.mutateAsync({
        pledger_uri: c.pledger_uri,
        title: c.title,
        offer_type: c.offer_type,
        quantity: c.quantity ?? undefined,
        unit: c.unit ?? undefined,
        validity_start: c.validity_start ?? undefined,
        validity_end: c.validity_end ?? undefined,
        metadata: c.metadata,
      });
      setRoutingSuggestions({
        rid: c.commitment_rid,
        suggestions: result.suggestions,
      });
    } catch (err) {
      setRoutingError(err instanceof Error ? err.message : "Routing check failed");
    }
  }

  const pledgeMutation = usePledgeToPool(NODE_ID);
  const [pledgeError, setPledgeError] = useState<string | null>(null);

  async function handleModalPledge(poolRid: string, commitmentRid: string) {
    setPledgeError(null);
    try {
      await pledgeMutation.mutateAsync({ poolRid, commitmentRid });
      setRoutingSuggestions(null);
    } catch (err) {
      setPledgeError(err instanceof Error ? err.message : "Pledge failed");
    }
  }

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
            <h1 className="text-base font-semibold">Commitments</h1>
            <p className="text-xs text-gray-500">
              Review, route, and curate commitments into pools
            </p>
          </div>
          <UserMenu />
          <Link
            href="/pools"
            title="Browse commitment pools"
            className="px-3 py-1.5 bg-gray-700 rounded text-sm hover:bg-gray-600"
          >
            View Pools
          </Link>
          <Link
            href="/commit"
            title="Create a new commitment with offer details and routing metadata"
            className="px-3 py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-500"
          >
            + New Commitment
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(
            [
              { value: "", tip: "Show all commitments regardless of state" },
              { value: "PROPOSED", tip: "Newly created commitments awaiting review" },
              { value: "VERIFIED", tip: "Commitments confirmed by a steward" },
              { value: "ACTIVE", tip: "Commitments currently being fulfilled" },
              { value: "EVIDENCE_LINKED", tip: "Commitments with linked proof of work" },
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
            )
          )}
        </div>

        {isLoading && (
          <p className="text-gray-500 text-sm">Loading commitments...</p>
        )}
        {error && (
          <p className="text-red-400 text-sm">
            Error loading commitments: {(error as Error).message}
          </p>
        )}

        {routingError && (
          <p className="text-red-400 text-sm mb-4 p-3 bg-red-900/20 border border-red-800 rounded">
            Routing check failed: {routingError}
          </p>
        )}

        {poolRidParam && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300">
            <span>
              Filtered by pool:{" "}
              <span className="font-mono text-xs">{poolRidParam}</span>
            </span>
            <Link
              href="/commitments"
              title="Remove pool filter and show all commitments"
              className="ml-auto text-blue-400 hover:text-white text-xs"
            >
              &times; Clear
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {commitments?.map((c) => (
            <CommitmentCard
              key={c.commitment_rid}
              commitment={c}
              onShowRouting={handleShowRouting}
            />
          ))}
          {commitments?.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No commitments found.{" "}
              <Link href="/commit" className="text-blue-400 hover:underline">
                Create one
              </Link>
              .
            </p>
          )}
        </div>

        {/* Routing suggestions panel */}
        {routingSuggestions && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-sm">
                    Pool Routing Suggestions
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {routingSuggestions.rid}
                  </p>
                </div>
                <button
                  onClick={() => setRoutingSuggestions(null)}
                  title="Close routing suggestions"
                  className="text-gray-400 hover:text-white text-lg"
                >
                  &times;
                </button>
              </div>

              {routingSuggestions.suggestions.length === 0 ? (
                <p className="text-sm text-gray-500">No matching pools.</p>
              ) : (
                <div className="space-y-3">
                  {routingSuggestions.suggestions.map((s) => (
                    <div
                      key={s.pool_rid}
                      className={`p-4 rounded-lg border ${
                        s.recommended
                          ? "border-emerald-700 bg-emerald-900/20"
                          : s.hard_excludes.length > 0
                            ? "border-red-800 bg-red-900/10"
                            : "border-gray-700 bg-gray-800"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{s.pool_name}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {s.explanation}
                          </p>
                        </div>
                        <span
                          className={`text-lg font-bold ${s.recommended ? "text-emerald-400" : "text-gray-400"}`}
                        >
                          {s.total_score}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {Object.entries(s.score_breakdown).map(([k, v]) =>
                          v > 0 ? (
                            <span
                              key={k}
                              className="px-2 py-0.5 bg-gray-900 rounded text-xs text-gray-300"
                            >
                              {k.replace(/_/g, " ")}: +{v}
                            </span>
                          ) : null
                        )}
                        {s.hard_excludes.map((ex) => (
                          <span
                            key={ex}
                            className="px-2 py-0.5 bg-red-900/50 rounded text-xs text-red-300"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                      {s.recommended && !s.hard_excludes.length && (
                        <button
                          onClick={() =>
                            handleModalPledge(s.pool_rid, routingSuggestions.rid)
                          }
                          disabled={pledgeMutation.isPending}
                          title="Assign this commitment to the selected pool based on routing match"
                          className="mt-3 px-4 py-1.5 bg-emerald-700 rounded text-xs hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {pledgeMutation.isPending
                            ? "Pledging..."
                            : "Pledge to This Pool"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {pledgeError && (
                <p className="text-red-400 text-sm mt-3">{pledgeError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
