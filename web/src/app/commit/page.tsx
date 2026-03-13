"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useCreateCommitment,
  type CommitmentCreatePayload,
} from "@/hooks/useCommitments";
import {
  useCommitmentRouting,
  type PoolSuggestion,
} from "@/hooks/useCommitmentRouting";
import UserMenu from "@/components/auth/UserMenu";

const NODE_ID = "octo-salish-sea";

const OFFER_TYPES = [
  "labor",
  "goods",
  "service",
  "knowledge",
  "stewardship",
] as const;

const SALISH_SEA_URI =
  "orn:personal-koi.entity:bioregion-salish-sea-1a680eed1248";

const PRESETS = [
  {
    label: "Restoration",
    title: "Native plant restoration — 200 hours",
    description:
      "Seasonal restoration work including invasive species removal, native plant propagation, and riparian buffer planting across Greater Victoria watersheds.",
    pledgerUri:
      "orn:personal-koi.entity:organization-regenerate-cascadia-f584d824b667",
    bioregionUri: SALISH_SEA_URI,
    offerType: "stewardship",
    quantity: "200",
    unit: "hours",
    estimatedValue: "8000",
    wants: "soil testing equipment access, volunteer coordination support",
    limits: "max 3 concurrent restoration sites",
    routingTags: "restoration, native-plants, labor",
    validityStart: "2026-04-01",
    validityEnd: "2026-10-31",
  },
  {
    label: "Equipment Loan",
    title: "Soil monitoring equipment loan — 1 kit",
    description:
      "Professional soil health monitoring kit including pH meter, conductivity sensor, and nutrient analysis tools available for shared use across restoration sites.",
    pledgerUri:
      "orn:personal-koi.entity:organization-kinship-earth-d3bc94d6ea17",
    bioregionUri: SALISH_SEA_URI,
    offerType: "goods",
    quantity: "1",
    unit: "equipment-kit",
    estimatedValue: "3000",
    wants: "restoration site access for data collection, shared soil health data",
    limits: "equipment must be returned in working condition, max 2 concurrent loans",
    routingTags: "monitoring, equipment, soil-health",
    validityStart: "2026-04-01",
    validityEnd: "2026-12-31",
  },
  {
    label: "Mycoremediation",
    title: "Mycoremediation labor — 40 hours",
    description:
      "Specialized mycoremediation services for contaminated soil restoration using native fungal species, including site assessment, inoculation, and monitoring.",
    pledgerUri:
      "orn:personal-koi.entity:organization-mycopunks-76f1b18f22ce",
    bioregionUri: SALISH_SEA_URI,
    offerType: "service",
    quantity: "40",
    unit: "hours",
    estimatedValue: "2000",
    wants: "contaminated site access, baseline soil testing",
    limits: "single site only, requires minimum 0.5 acre area",
    routingTags: "mycoremediation, restoration, fungi",
    validityStart: "2026-04-01",
    validityEnd: "2026-09-30",
  },
] as const;

export default function CommitPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pledgerUri, setPledgerUri] = useState("");
  const [offerType, setOfferType] = useState<string>("stewardship");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [validityStart, setValidityStart] = useState("");
  const [validityEnd, setValidityEnd] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [bioregionUri, setBioregionUri] = useState("");
  const [wants, setWants] = useState("");
  const [limits, setLimits] = useState("");
  const [routingTags, setRoutingTags] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [suggestions, setSuggestions] = useState<PoolSuggestion[] | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const createMutation = useCreateCommitment(NODE_ID);
  const routingMutation = useCommitmentRouting(NODE_ID);

  function buildPayload(): CommitmentCreatePayload {
    return {
      pledger_uri: pledgerUri,
      title,
      description: description || undefined,
      offer_type: offerType,
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit: unit || undefined,
      validity_start: validityStart || undefined,
      validity_end: validityEnd || undefined,
      metadata: {
        wants: wants
          ? wants.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        limits: limits
          ? limits.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        routing_tags: routingTags
          ? routingTags.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        estimated_value_usd: estimatedValue
          ? parseFloat(estimatedValue)
          : undefined,
        bioregion_uri: bioregionUri || undefined,
      },
    };
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setTitle(preset.title);
    setDescription(preset.description);
    setPledgerUri(preset.pledgerUri);
    setBioregionUri(preset.bioregionUri);
    setOfferType(preset.offerType);
    setQuantity(preset.quantity);
    setUnit(preset.unit);
    setEstimatedValue(preset.estimatedValue);
    setWants(preset.wants);
    setLimits(preset.limits);
    setRoutingTags(preset.routingTags);
    setValidityStart(preset.validityStart);
    setValidityEnd(preset.validityEnd);
    setSuggestions(null);
  }

  const [routingError, setRoutingError] = useState<string | null>(null);

  async function handleCheckRouting() {
    setRoutingError(null);
    try {
      const payload = buildPayload();
      const result = await routingMutation.mutateAsync({
        pledger_uri: payload.pledger_uri,
        title: payload.title,
        offer_type: payload.offer_type,
        quantity: payload.quantity,
        unit: payload.unit,
        validity_start: payload.validity_start,
        validity_end: payload.validity_end,
        metadata: payload.metadata,
      });
      setSuggestions(result.suggestions);
    } catch (err) {
      setRoutingError(err instanceof Error ? err.message : "Routing check failed");
    }
  }

  async function handleCreate() {
    const payload = buildPayload();
    const result = await createMutation.mutateAsync(payload);
    setCreated(result.commitment_rid);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto fixed inset-0">
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            &larr; Back
          </Link>
          <div className="h-4 w-px bg-gray-700" />
          <h1 className="text-base font-semibold flex-1">Create Commitment</h1>
          <UserMenu />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {created ? (
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-emerald-300 mb-2">
              Commitment Created
            </h2>
            <p className="text-sm text-gray-400 font-mono break-all">
              {created}
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <Link
                href="/commitments"
                className="px-4 py-2 bg-gray-800 rounded text-sm hover:bg-gray-700"
              >
                View All Commitments
              </Link>
              <button
                onClick={() => {
                  setCreated(null);
                  setSuggestions(null);
                }}
                className="px-4 py-2 bg-blue-600 rounded text-sm hover:bg-blue-500"
              >
                Create Another
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-400">
              Commitments are self-sovereign. Anyone can promise. The question is
              which pools accept it.
            </p>

            {/* Preset buttons */}
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs hover:bg-gray-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Core fields */}
            <div className="grid gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Native plant restoration — 200 hours"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Offer details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Offer Type
                </label>
                <select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {OFFER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Quantity
                </label>
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  type="number"
                  placeholder="200"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Unit
                </label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="hours"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Dates + value */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  value={validityStart}
                  onChange={(e) => setValidityStart(e.target.value)}
                  type="date"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  value={validityEnd}
                  onChange={(e) => setValidityEnd(e.target.value)}
                  type="date"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Estimated Value (USD)
                </label>
                <input
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  type="number"
                  placeholder="8000"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Routing metadata */}
            <div className="grid gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Wants (comma-separated)
                </label>
                <input
                  value={wants}
                  onChange={(e) => setWants(e.target.value)}
                  placeholder="soil testing equipment, volunteer coordination"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Limits (comma-separated)
                </label>
                <input
                  value={limits}
                  onChange={(e) => setLimits(e.target.value)}
                  placeholder="max 3 concurrent sites"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Routing Tags (comma-separated)
                </label>
                <input
                  value={routingTags}
                  onChange={(e) => setRoutingTags(e.target.value)}
                  placeholder="restoration, native-plants, labor"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Advanced fields (URI inputs) */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
              </button>
              {showAdvanced && (
                <div className="grid gap-4 mt-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Pledger URI
                    </label>
                    <input
                      value={pledgerUri}
                      onChange={(e) => setPledgerUri(e.target.value)}
                      placeholder="orn:koi-net.entity:..."
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Organization or person entity URI from the knowledge graph
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Bioregion URI
                    </label>
                    <input
                      value={bioregionUri}
                      onChange={(e) => setBioregionUri(e.target.value)}
                      placeholder="orn:koi-net.entity:salish-sea+..."
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Bioregion entity URI from the knowledge graph (e.g.
                      orn:...salish-sea...). Strongest routing factor (+30 points).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 items-center">
              <button
                onClick={handleCheckRouting}
                disabled={!title || routingMutation.isPending}
                className="px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {routingMutation.isPending
                  ? "Checking..."
                  : "Check Pool Routes"}
              </button>
              <button
                onClick={handleCreate}
                disabled={!title || !pledgerUri || createMutation.isPending}
                className="px-4 py-2 bg-blue-600 rounded text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? "Creating..." : "Create Commitment"}
              </button>
              {!pledgerUri && !showAdvanced && (
                <span className="text-xs text-gray-500">
                  Select a preset or show advanced fields to set pledger
                </span>
              )}
            </div>

            {createMutation.isError && (
              <p className="text-red-400 text-sm">
                {createMutation.error.message}
              </p>
            )}

            {routingError && (
              <p className="text-red-400 text-sm p-3 bg-red-900/20 border border-red-800 rounded">
                Routing check failed: {routingError}
              </p>
            )}

            {/* Routing suggestions */}
            {suggestions && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-300">
                  Routing Suggestions
                </h3>
                {suggestions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No matching pools found.
                  </p>
                ) : (
                  suggestions.map((s) => (
                    <div
                      key={s.pool_rid}
                      className={`p-4 rounded-lg border ${
                        s.recommended
                          ? "border-emerald-700 bg-emerald-900/20"
                          : s.hard_excludes.length > 0
                            ? "border-red-800 bg-red-900/10"
                            : "border-gray-700 bg-gray-900"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{s.pool_name}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {s.explanation}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-lg font-bold ${
                              s.recommended
                                ? "text-emerald-400"
                                : "text-gray-400"
                            }`}
                          >
                            {s.total_score}
                          </span>
                          {s.recommended && (
                            <p className="text-xs text-emerald-500">
                              Recommended
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {Object.entries(s.score_breakdown).map(([k, v]) =>
                          v > 0 ? (
                            <span
                              key={k}
                              className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300"
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
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
