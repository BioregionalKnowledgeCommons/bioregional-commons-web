'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import {
  DOMAIN_COLORS,
  REALM_COLORS,
  type BioregionInfo,
  type BioregionLookup,
  type GeoClassification,
  type Realm,
} from '@/types';
import { assetPath } from '@/lib/constants';
import { LIVE_ONLY } from '@/lib/feature-flags';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

// ─── Constants ────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const TAG_SUGGESTIONS = [
  'watershed-governance', 'food-systems', 'cultural-heritage',
  'ecological-restoration', 'community-governance', 'traditional-knowledge',
  'climate-resilience',
  'water-rights', 'permaculture', 'seed-saving', 'land-trust',
  'indigenous-sovereignty', 'urban-ecology', 'regenerative-agriculture',
  'mycology', 'wildlife-corridors', 'renewable-energy', 'circular-economy',
  'agroforestry', 'marine-conservation', 'soil-health', 'river-systems',
  'pollinator-habitat', 'fire-ecology', 'wetland-restoration',
  'cooperative-economics', 'biochar', 'composting', 'citizen-science',
];

const DOMAIN_LABELS: Record<string, string> = {
  'watershed-governance': 'Watershed Governance',
  'food-systems': 'Food Systems',
  'cultural-heritage': 'Cultural Heritage',
  'ecological-restoration': 'Ecological Restoration',
  'community-governance': 'Community Governance',
  'traditional-knowledge': 'Traditional Knowledge',
  'climate-resilience': 'Climate Resilience',
  other: 'Other',
};

const LAUNCH_MESSAGES = [
  'Creating GitHub repository...',
  'Scaffolding knowledge vault...',
  'Configuring Quartz publishing...',
  'Registering with the commons network...',
  'Summoning your AI steward agent...',
];

// ─── RESOLVE Ecoregions API ──────────────────────────────────────────
const ECOREGION_API =
  'https://data-gis.unep-wcmc.org/server/rest/services/Bio-geographicalRegions/Resolve_Ecoregions/FeatureServer/0/query';

async function queryEcoregion(
  lng: number,
  lat: number,
): Promise<{ eco_name: string; biome_name: string; eco_id: number } | null> {
  try {
    const geometry = encodeURIComponent(
      JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    );
    const url = `${ECOREGION_API}?geometry=${geometry}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=eco_name,biome_name,eco_id&returnGeometry=false&f=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.[0]) {
      return data.features[0].attributes;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Slide animation variants ─────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 180 : -180,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -180 : 180,
    opacity: 0,
  }),
};

// ─── Shared styles ────────────────────────────────────────────────────

const inputClass =
  'w-full bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors';

const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-6 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none';

const secondaryBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gray-800/60 border border-gray-700/40 px-5 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700/60 transition-colors cursor-pointer';

// ─── Helpers ──────────────────────────────────────────────────────────

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 6371;
}

function approxPolygonAreaKm2(points: [number, number][]): number {
  if (points.length < 3) return 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const [lng1, lat1] = points[i];
    const [lng2, lat2] = points[j];
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * 6371 * 6371) / 2);
}

// ═════════════════════════════════════════════════════════════════════
// OnboardingWizard
// ═════════════════════════════════════════════════════════════════════

export default function OnboardingWizard() {
  const showOnboarding = useGlobeStore((s) => s.showOnboarding);
  const setShowOnboarding = useGlobeStore((s) => s.setShowOnboarding);
  const flyTo = useGlobeStore((s) => s.flyTo);

  // Globe boundary drawing state
  const boundary = useGlobeStore((s) => s.onboardingBoundary);
  const isDrawing = useGlobeStore((s) => s.isDrawingBoundary);
  const setIsDrawing = useGlobeStore((s) => s.setIsDrawingBoundary);
  const clearBoundary = useGlobeStore((s) => s.clearBoundary);
  const undoBoundaryPoint = useGlobeStore((s) => s.undoBoundaryPoint);

  // ─── Wizard state ─────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 2
  const [commonsName, setCommonsName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Step 3
  const [allBioregions, setAllBioregions] = useState<BioregionInfo[]>([]);
  const [selectedBioregion, setSelectedBioregion] = useState<BioregionInfo | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoTags, setGeoTags] = useState<GeoClassification | null>(null);
  const [ecoLoading, setEcoLoading] = useState(false);

  // Step 4
  const [connectedNodes, setConnectedNodes] = useState<Set<string>>(new Set());

  // Step 6
  const [launchSteps, setLaunchSteps] = useState<boolean[]>(new Array(5).fill(false));
  const [launchComplete, setLaunchComplete] = useState(false);

  // ─── Fetch bioregions ─────────────────────────────────────────────
  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((r) => r.json())
      .then((data: BioregionLookup) => {
        const list = Object.values(data).sort((a, b) => a.name.localeCompare(b.name));
        setAllBioregions(list);
      })
      .catch(console.error);
  }, []);

  // ─── Auto-detect geo hierarchy from boundary points ─────────────
  useEffect(() => {
    if (boundary.length === 0 || allBioregions.length === 0) return;

    const centroid: [number, number] = boundary.reduce(
      (acc, [lng, lat]) =>
        [acc[0] + lng / boundary.length, acc[1] + lat / boundary.length] as [number, number],
      [0, 0] as [number, number],
    );

    // Find nearest bioregion
    let nearest: BioregionInfo | null = null;
    let minDist = Infinity;
    for (const bio of allBioregions) {
      const d = haversineDistance(centroid[1], centroid[0], bio.centroid[1], bio.centroid[0]);
      if (d < minDist) {
        minDist = d;
        nearest = bio;
      }
    }
    if (nearest) {
      setSelectedBioregion(nearest);
      setGeoTags((prev) => ({
        realm: nearest!.realm,
        realm_code: nearest!.code.substring(0, 2),
        subrealm: nearest!.subrealm,
        bioregion: nearest!.name,
        bioregion_code: nearest!.code,
        // Preserve ecoregion if already loaded
        ecoregion: prev?.ecoregion,
        ecoregion_id: prev?.ecoregion_id,
        biome: prev?.biome,
      }));
    }

    // Query RESOLVE API for ecoregion
    setEcoLoading(true);
    queryEcoregion(centroid[0], centroid[1]).then((eco) => {
      setEcoLoading(false);
      if (eco) {
        setGeoTags((prev) =>
          prev
            ? { ...prev, ecoregion: eco.eco_name, ecoregion_id: eco.eco_id, biome: eco.biome_name }
            : null,
        );
      }
    });
  }, [boundary, allBioregions]);

  // ─── Launch sequence ──────────────────────────────────────────────
  useEffect(() => {
    if (step !== 6) return;
    setLaunchSteps(new Array(5).fill(false));
    setLaunchComplete(false);

    const delays = [1000, 1500, 2000, 2500, 3000];
    const timers = delays.map((delay, i) =>
      setTimeout(() => {
        setLaunchSteps((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay),
    );
    const completeTimer = setTimeout(() => {
      setLaunchComplete(true);
      // Save the completed commons profile to localStorage
      saveCommonsProfile();
    }, 4000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Save profile to registry (localStorage for demo) ─────────
  const saveCommonsProfile = useCallback(() => {
    const profile = {
      node_id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      display_name: commonsName,
      description,
      github_username: githubUsername,
      topic_tags: tags,
      territory_boundary: boundary,
      geo_classification: geoTags,
      bioregion_codes: geoTags ? [geoTags.bioregion_code] : [],
      thematic_domain: tags[0] || 'other',
      connected_nodes: Array.from(connectedNodes),
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('pending-commons') || '[]');
      existing.push(profile);
      localStorage.setItem('pending-commons', JSON.stringify(existing));
    } catch {
      // Storage unavailable
    }
  }, [commonsName, description, githubUsername, tags, boundary, geoTags, connectedNodes]);

  // ─── Navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    // Leaving step 3: stop drawing mode
    if (step === 3) {
      setIsDrawing(false);
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [step, setIsDrawing]);

  const goBack = useCallback(() => {
    if (step === 4) {
      // Going back to step 3: re-enable drawing mode
      setIsDrawing(true);
    }
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, [step, setIsDrawing]);

  const close = useCallback(() => {
    setShowOnboarding(false);
    setIsDrawing(false);
    setTimeout(() => {
      setStep(1);
      setDirection(1);
      setCommonsName('');
      setDescription('');
      setGithubUsername('');
      setTags([]);
      setTagInput('');
      setSelectedBioregion(null);
      setLocating(false);
      setGeoTags(null);
      setEcoLoading(false);
      clearBoundary();
      setConnectedNodes(new Set());
      setLaunchSteps(new Array(5).fill(false));
      setLaunchComplete(false);
    }, 400);
  }, [setShowOnboarding, setIsDrawing, clearBoundary]);

  // ─── Tag helpers ────────────────────────────────────────────────────
  const addTag = useCallback((tag: string) => {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized) return;
    setTags((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setTagInput('');
  }, []);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(tagInput);
      } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1));
      }
    },
    [tagInput, tags, addTag],
  );

  const filteredSuggestions = useMemo(() => {
    const q = tagInput.toLowerCase();
    return TAG_SUGGESTIONS.filter((s) => !tags.includes(s) && (!q || s.includes(q))).slice(0, 12);
  }, [tags, tagInput]);

  // ─── Step 3: Enter drawing mode + Use My Location ──────────────────
  const handleStartDrawing = useCallback(() => {
    setIsDrawing(true);
  }, [setIsDrawing]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        flyTo(latitude, longitude, 2.0);
        setLocating(false);
        // Enable drawing mode
        setIsDrawing(true);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [flyTo, setIsDrawing]);

  // ─── Step 4: matching nodes ───────────────────────────────────────
  const matchingNodes = useMemo(() => {
    if (!selectedBioregion || !seedImports) return [];
    const { seedNodes, bioregionLookup: seedBioregionLookup } = seedImports;
    return seedNodes.filter((node: import('@/types').NodeEntry) => {
      const nodeCode = node.bioregion_codes[0];
      const nodeBio = seedBioregionLookup[nodeCode];
      const realmMatch = nodeBio?.realm === selectedBioregion.realm;
      const tagMatch = tags.some(
        (t: string) => node.thematic_domain === t || node.topic_tags.includes(t),
      );
      return realmMatch || tagMatch;
    });
  }, [selectedBioregion, tags]);

  const toggleConnection = useCallback((nodeId: string) => {
    setConnectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Switch to guided onboarding (IntakeForm) - must be before early return
  const handleGuidedOnboarding = useCallback(() => {
    setShowOnboarding(false);
    // Small delay to let the wizard close before opening the form
    setTimeout(() => {
      useGlobeStore.getState().setShowIntakeForm(true);
    }, 300);
  }, [setShowOnboarding]);

  // ─── Don't render if hidden ───────────────────────────────────────
  if (!showOnboarding) return null;

  // ═══════════════════════════════════════════════════════════════════
  // Step renderers
  // ═══════════════════════════════════════════════════════════════════

  const renderStep1 = () => (
    <div className="flex flex-col items-center text-center px-2">
      <div className="relative mb-8 mt-2">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500/20 via-teal-400/10 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-400/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
          </div>
        </div>
        <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping" style={{ animationDuration: '3s' }} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Start Your Knowledge Commons</h2>
      <p className="text-sm text-gray-400 leading-relaxed max-w-sm mb-8">
        In a few steps, we&apos;ll help you set up a community knowledge garden rooted in your bioregion.
      </p>
      <button className={primaryBtnClass} onClick={goNext}>
        Let&apos;s Begin
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
      {/* Link to guided onboarding */}
      <button
        onClick={handleGuidedOnboarding}
        className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2 cursor-pointer"
      >
        Prefer a guided onboarding session? Request one here
      </button>
    </div>
  );

  // ─── Step 2: Name + Tags ──────────────────────────────────────────
  const renderStep2 = () => (
    <div className="flex flex-col gap-5 px-1">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Name Your Commons</h2>
        <p className="text-sm text-gray-400">Give your knowledge commons an identity.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Commons Name *</label>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. Sonoran Desert Water Keepers"
          value={commonsName}
          onChange={(e) => setCommonsName(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
        <textarea
          className={`${inputClass} min-h-[80px] resize-none`}
          placeholder="What knowledge will your commons steward? What community does it serve?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Your GitHub Username</label>
        <input
          type="text"
          className={inputClass}
          placeholder="@your-handle"
          value={githubUsername}
          onChange={(e) => setGithubUsername(e.target.value)}
        />
      </div>

      {/* Tag Input */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Topic Tags</label>
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl px-3 py-2.5 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-colors">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-cyan-400/60 hover:text-cyan-300 transition-colors cursor-pointer"
                  aria-label={`Remove ${tag}`}
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              type="text"
              className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none py-0.5"
              placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : 'Add more...'}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
          </div>
        </div>
        {filteredSuggestions.length > 0 && (
          <div className="mt-2.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Suggestions</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="rounded-full px-2.5 py-1 text-[11px] text-gray-400 border border-gray-700/40 bg-gray-800/40 hover:bg-gray-700/50 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button className={secondaryBtnClass} onClick={goBack}>← Back</button>
        <button className={primaryBtnClass} onClick={goNext} disabled={!commonsName.trim()}>Continue →</button>
      </div>
    </div>
  );

  // ─── Step 3: Territory Drawing on Globe ────────────────────────────
  const renderStep3 = () => (
    <div className="flex flex-col gap-4 px-1">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Define Your Commons Territory</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Draw a boundary on the globe to define your commons membrane. This could be a neighborhood, watershed, valley, or any meaningful territory.
        </p>
      </div>

      {/* Instructions / Drawing status */}
      {!isDrawing && boundary.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-5 text-center">
          <div className="text-2xl mb-3">🌍</div>
          <p className="text-sm text-gray-300 mb-4">
            First, navigate to your area on the globe behind this panel, then start placing boundary points.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              className={`${primaryBtnClass} text-xs py-2.5 px-4`}
              onClick={handleUseMyLocation}
              disabled={locating}
            >
              📍 {locating ? 'Finding...' : 'Use My Location'}
            </button>
            <button
              className={`${secondaryBtnClass} text-xs py-2.5 px-4`}
              onClick={handleStartDrawing}
            >
              ✏️ Start Drawing
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Active drawing indicator */}
          {isDrawing && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-4 py-2.5 flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
              </span>
              <span className="text-xs text-cyan-300 font-medium">Drawing mode active — click on the globe to place points</span>
            </div>
          )}

          {/* Point count + area */}
          <div className="text-xs text-gray-500 flex items-center gap-3">
            <span>
              Points: <span className="text-gray-300 font-medium">{boundary.length}</span> placed
            </span>
            {boundary.length >= 3 && (
              <>
                <span className="text-gray-600">•</span>
                <span>
                  Area: <span className="text-gray-300 font-medium">~{Math.round(approxPolygonAreaKm2(boundary)).toLocaleString()} km²</span>
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isDrawing && (
              <button
                type="button"
                className={`${secondaryBtnClass} text-xs py-2 px-3`}
                onClick={handleStartDrawing}
              >
                ✏️ Resume Drawing
              </button>
            )}
            {isDrawing && (
              <button
                type="button"
                className={`${secondaryBtnClass} text-xs py-2 px-3 border-cyan-500/30 text-cyan-300`}
                onClick={() => setIsDrawing(false)}
              >
                ✓ Done Drawing
              </button>
            )}
            <button
              type="button"
              className={`${secondaryBtnClass} text-xs py-2 px-3`}
              onClick={() => undoBoundaryPoint()}
              disabled={boundary.length === 0}
            >
              Undo Last
            </button>
            <button
              type="button"
              className={`${secondaryBtnClass} text-xs py-2 px-3`}
              onClick={() => {
                clearBoundary();
                setGeoTags(null);
                setSelectedBioregion(null);
              }}
              disabled={boundary.length === 0}
            >
              ↺ Clear All
            </button>
          </div>
        </>
      )}

      {/* Geographic Classification — holonic hierarchy */}
      {geoTags && (
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 space-y-0 divide-y divide-gray-700/20">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium pb-2.5">
            Geographic Classification
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <span className="text-base w-6 text-center">🌍</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-500 block">Realm</span>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: REALM_COLORS[geoTags.realm as Realm] || '#666' }}
                />
                <span className="text-sm text-gray-200">{geoTags.realm}</span>
                <span className="text-[10px] font-mono text-gray-500">{geoTags.realm_code}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <span className="text-base w-6 text-center">🗺️</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-500 block">Subrealm</span>
              <span className="text-sm text-gray-200">{geoTags.subrealm}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <span className="text-base w-6 text-center">🌿</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-500 block">Bioregion</span>
              <span className="text-sm text-gray-200">{geoTags.bioregion}</span>
              <span className="text-xs font-mono text-gray-500 ml-2">{geoTags.bioregion_code}</span>
            </div>
          </div>
          {/* Ecoregion — from RESOLVE API */}
          <div className="flex items-center gap-3 py-2.5">
            <span className="text-base w-6 text-center">🦎</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-500 block">Ecoregion</span>
              {ecoLoading ? (
                <span className="text-xs text-gray-500 italic">Resolving ecoregion...</span>
              ) : geoTags.ecoregion ? (
                <span className="text-sm text-gray-200">{geoTags.ecoregion}</span>
              ) : (
                <span className="text-xs text-gray-500 italic">Place points to detect</span>
              )}
            </div>
          </div>
          {/* Biome */}
          {geoTags.biome && (
            <div className="flex items-center gap-3 py-2.5">
              <span className="text-base w-6 text-center">🌳</span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-500 block">Biome</span>
                <span className="text-sm text-gray-200">{geoTags.biome}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button className={secondaryBtnClass} onClick={goBack}>← Back</button>
        <button className={primaryBtnClass} onClick={goNext} disabled={boundary.length < 3}>
          Continue →
        </button>
      </div>
    </div>
  );

  // ─── Step 4: Connect with Related Commons ─────────────────────────
  const renderStep4 = () => (
    <div className="flex flex-col gap-4 px-1">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Connect with Related Commons</h2>
        <p className="text-sm text-gray-400">
          These existing commons share your bioregion or related topics.
        </p>
      </div>

      {matchingNodes.length === 0 ? (
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 px-6 py-10 text-center">
          <div className="text-2xl mb-3">🌱</div>
          <p className="text-sm text-gray-400 leading-relaxed">
            No nearby commons yet — you&apos;ll be the first in your region!
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
          {matchingNodes.map((node) => {
            const isConnected = connectedNodes.has(node.node_id);
            const nodeCode = node.bioregion_codes[0];
            const nodeBio = seedImports?.bioregionLookup[nodeCode];
            return (
              <div
                key={node.node_id}
                className={`rounded-xl border px-4 py-3 transition-all ${
                  isConnected
                    ? 'border-cyan-500/40 bg-cyan-500/5'
                    : 'border-gray-700/30 bg-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-200 truncate">{node.display_name}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${DOMAIN_COLORS[node.thematic_domain]}20`,
                          color: DOMAIN_COLORS[node.thematic_domain],
                        }}
                      >
                        {DOMAIN_LABELS[node.thematic_domain]}
                      </span>
                      {nodeBio && (
                        <span className="text-[10px] text-gray-500">{nodeBio.name}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConnection(node.node_id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      isConnected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200'
                    }`}
                  >
                    {isConnected ? '✓ Connected' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button className={secondaryBtnClass} onClick={goBack}>← Back</button>
        <button className={primaryBtnClass} onClick={goNext}>Continue →</button>
      </div>
    </div>
  );

  // ─── Step 5: Review ───────────────────────────────────────────────
  const renderStep5 = () => (
    <div className="flex flex-col gap-5 px-1">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Review Your Commons</h2>
        <p className="text-sm text-gray-400">Everything look right? Let&apos;s launch it.</p>
      </div>

      <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-5 space-y-4">
        {/* Name */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Name</span>
          <p className="text-base font-semibold text-white">{commonsName}</p>
        </div>

        {description && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Description</span>
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{description}</p>
          </div>
        )}

        {/* Topic Tags */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1.5">Topic Tags</span>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-500 italic">No tags selected</span>
          )}
        </div>

        {/* Territory + Full Geo Hierarchy */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1.5">Territory</span>
          <p className="text-sm text-gray-300 mb-2">
            {boundary.length} boundary point{boundary.length !== 1 ? 's' : ''} defined
            {boundary.length >= 3 && (
              <span className="text-gray-500 ml-1">
                (~{Math.round(approxPolygonAreaKm2(boundary)).toLocaleString()} km²)
              </span>
            )}
          </p>
          {geoTags && (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: REALM_COLORS[geoTags.realm as Realm] || '#666' }}
                />
                <span className="text-gray-300">{geoTags.realm}</span>
                <span className="text-gray-600">→</span>
                <span className="text-gray-300">{geoTags.subrealm}</span>
                <span className="text-gray-600">→</span>
                <span className="text-gray-300">{geoTags.bioregion}</span>
                <span className="font-mono text-gray-500">{geoTags.bioregion_code}</span>
              </div>
              {geoTags.ecoregion && (
                <div className="flex items-center gap-2 text-gray-400 pl-4">
                  <span className="text-gray-600">└</span>
                  <span className="text-gray-300">{geoTags.ecoregion}</span>
                  {geoTags.biome && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-400">{geoTags.biome}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {githubUsername && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">GitHub</span>
            <p className="text-sm text-gray-300 font-mono">
              {githubUsername.startsWith('@') ? githubUsername : `@${githubUsername}`}
            </p>
          </div>
        )}

        <div>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Proposed Connections</span>
          <p className="text-sm text-gray-300">
            {connectedNodes.size > 0
              ? `${connectedNodes.size} commons bridge${connectedNodes.size > 1 ? 's' : ''}`
              : 'None yet'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button className={secondaryBtnClass} onClick={goBack}>← Back to Edit</button>
        <button className={primaryBtnClass} onClick={goNext}>Launch My Commons →</button>
      </div>
    </div>
  );

  // ─── Step 6: Launch ───────────────────────────────────────────────
  const renderStep6 = () => (
    <div className="flex flex-col items-center text-center px-2">
      <h2 className="text-xl font-bold text-white mb-6">
        {launchComplete ? 'Your commons is being prepared!' : 'Launching Your Commons...'}
      </h2>

      <div className="w-full max-w-xs space-y-3 mb-8">
        {LAUNCH_MESSAGES.map((msg, i) => {
          const done = launchSteps[i];
          const isLast = i === LAUNCH_MESSAGES.length - 1;
          return (
            <motion.div
              key={msg}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: done ? 1 : 0.3, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-center gap-3 text-left"
            >
              {done ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isLast
                      ? 'bg-gradient-to-r from-cyan-400 to-teal-300 text-gray-950 shadow-lg shadow-cyan-400/40'
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}
                >
                  ✓
                </motion.span>
              ) : (
                <span className="shrink-0 w-5 h-5 rounded-full border border-gray-700/60 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse" />
                </span>
              )}
              <span className={`text-sm ${done ? 'text-gray-200' : 'text-gray-600'} transition-colors`}>
                {msg}
              </span>
              {isLast && done && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-xs"
                >
                  ✨
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {launchComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4 space-y-2 max-w-sm">
              <p className="text-sm text-gray-300">
                We&apos;ll notify you at{' '}
                <span className="font-mono text-cyan-400">
                  {githubUsername.startsWith('@') ? githubUsername : `@${githubUsername || 'you'}`}
                </span>{' '}
                when everything is ready.
              </p>
              <p className="text-xs text-gray-500">
                Your commons profile has been saved to the local registry.
              </p>
            </div>
            <button className={primaryBtnClass} onClick={close}>Close</button>
          </motion.div>
        )}
      </AnimatePresence>

      {!launchComplete && (
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(6,182,212,0.15), transparent 70%)',
          }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  // ═══════════════════════════════════════════════════════════════════
  // Main render
  // ═══════════════════════════════════════════════════════════════════

  // When drawing on the globe, minimize the wizard to a compact panel
  // so the user can see and interact with the globe
  const isMinimizedForDrawing = isDrawing && step === 3;

  return (
    <AnimatePresence>
      {showOnboarding && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 z-[90] flex ${
            isMinimizedForDrawing
              ? 'items-end justify-start p-4 pointer-events-none'
              : 'items-center justify-center bg-black/60 backdrop-blur-sm'
          }`}
          onClick={isMinimizedForDrawing ? undefined : close}
          role="dialog"
          aria-label="Start a Commons wizard"
          aria-modal="true"
        >
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/40 shadow-2xl shadow-black/50 overflow-hidden flex flex-col pointer-events-auto ${
              isMinimizedForDrawing
                ? 'w-[360px] max-w-[90vw] max-h-[50vh]'
                : 'w-[520px] max-w-[92vw] max-h-[85vh]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-700/20 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  Step {step} of {TOTAL_STEPS}
                  {isMinimizedForDrawing && <span className="ml-2 text-cyan-400">· Drawing</span>}
                </span>
                {step < 6 && (
                  <button
                    onClick={close}
                    className="w-6 h-6 rounded-md bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer"
                    aria-label="Close wizard"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors duration-500"
                    style={{
                      backgroundColor: i < step ? '#06b6d4' : 'rgba(75,85,99,0.3)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 relative">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {stepRenderers[step - 1]()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
