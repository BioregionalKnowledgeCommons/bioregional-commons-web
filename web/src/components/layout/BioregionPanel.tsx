'use client';

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { assetPath } from '@/lib/constants';
import { REALM_COLORS, DOMAIN_COLORS, type BioregionInfo, type BioregionLookup, type NodeEntry, type EcoregionInfo } from '@/types';
import { getEcoColor } from '@/components/globe/EcoregionLayer';
import { LIVE_ONLY } from '@/lib/feature-flags';
import { useNodes } from '@/hooks/useNodes';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

// ─── RESOLVE Ecoregions API ──────────────────────────────────────────
const ECOREGION_API =
  'https://data-gis.unep-wcmc.org/server/rest/services/Bio-geographicalRegions/Resolve_Ecoregions/FeatureServer/0/query';

/** Fetch ecoregions within a bounding box around a centroid */
async function fetchEcoregionsForArea(
  lng: number,
  lat: number,
  halfDeg: number = 3,
): Promise<EcoregionInfo[]> {
  try {
    const envelope = JSON.stringify({
      xmin: lng - halfDeg,
      ymin: lat - halfDeg,
      xmax: lng + halfDeg,
      ymax: lat + halfDeg,
      spatialReference: { wkid: 4326 },
    });
    const params = new URLSearchParams({
      geometry: envelope,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'ECO_NAME,BIOME_NAME,ECO_ID',
      returnGeometry: 'false',
      resultRecordCount: '20',
      f: 'json',
    });
    const res = await fetch(`${ECOREGION_API}?${params}`);
    const data = await res.json();
    if (!data.features?.length) return [];

    // De-duplicate by ECO_ID (spatial queries can return dupes)
    const seen = new Set<number>();
    const results: EcoregionInfo[] = [];
    for (const feat of data.features) {
      const a = feat.attributes;
      const ecoId = a.ECO_ID ?? a.eco_id;
      const ecoName = a.ECO_NAME ?? a.eco_name;
      const biomeName = a.BIOME_NAME ?? a.biome_name;
      if (!ecoId || seen.has(ecoId)) continue;
      seen.add(ecoId);
      results.push({
        eco_id: ecoId,
        eco_name: ecoName || `Ecoregion ${ecoId}`,
        biome: biomeName || 'Unknown Biome',
        bioregion_code: '', // filled by caller if needed
      });
    }
    return results;
  } catch {
    return [];
  }
}

// ─── In-memory cache for API results ─────────────────────────────────
const ecoregionCache: Record<string, EcoregionInfo[]> = {};

/** Detect if current viewport is mobile (< 640px) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

// ─── Main Panel Component ────────────────────────────────────────────
export default function BioregionPanel() {
  const selectedBioregion = useGlobeStore((s) => s.selectedBioregion);
  const setSelectedBioregion = useGlobeStore((s) => s.setSelectedBioregion);
  const selectedEcoregion = useGlobeStore((s) => s.selectedEcoregion);
  const setSelectedEcoregion = useGlobeStore((s) => s.setSelectedEcoregion);
  const showEcoregions = useGlobeStore((s) => s.showEcoregions);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { data: nodesData } = useNodes();

  const [fullLookup, setFullLookup] = useState<BioregionLookup>({});

  // Dynamic ecoregion state
  const [ecoregions, setEcoregions] = useState<EcoregionInfo[]>([]);
  const [ecoLoading, setEcoLoading] = useState(false);

  // Load full bioregion lookup
  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((res) => res.json())
      .then((data: BioregionLookup) => setFullLookup(data))
      .catch(() => {});
  }, []);

  const bioregion = useMemo((): BioregionInfo | null => {
    if (!selectedBioregion) return null;
    return fullLookup[selectedBioregion] ?? null;
  }, [selectedBioregion, fullLookup]);

  // Fetch ecoregions dynamically when bioregion changes
  useEffect(() => {
    if (!bioregion || !showEcoregions) {
      setEcoregions([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const code = bioregion.code;

    // Check cache first
    if (ecoregionCache[code]) {
      setEcoregions(ecoregionCache[code]);
      return;
    }

    // Check seed data fallback
    if (seedImports) {
      const seedEcos = seedImports.getEcoregionsForBioregion(code);
      if (seedEcos.length > 0) {
        ecoregionCache[code] = seedEcos;
        setEcoregions(seedEcos);
        return;
      }
    }

    // Fetch from RESOLVE API
    setEcoLoading(true);
    const [lng, lat] = bioregion.centroid;
    fetchEcoregionsForArea(lng, lat).then((results) => {
      // Tag each result with the bioregion code
      const tagged = results.map((r) => ({ ...r, bioregion_code: code }));
      ecoregionCache[code] = tagged;
      setEcoregions(tagged);
      setEcoLoading(false);
    });
  }, [bioregion, showEcoregions]);

  // Currently drilled-down ecoregion info
  const activeEcoregion = useMemo((): EcoregionInfo | null => {
    if (selectedEcoregion === null) return null;
    return ecoregions.find((e) => e.eco_id === selectedEcoregion) ?? null;
  }, [selectedEcoregion, ecoregions]);

  // Find all nodes in this bioregion
  const allBioregionNodes = useMemo((): NodeEntry[] => {
    if (!selectedBioregion) return [];
    if (LIVE_ONLY) {
      // In LIVE_ONLY mode, convert live KOI nodes to NodeEntry shape for display
      const liveNodes = nodesData?.nodes ?? [];
      return liveNodes
        .filter((n) => n.bioregion_codes.includes(selectedBioregion))
        .map((n) => ({
          node_id: n.node_id,
          display_name: n.display_name,
          bioregion_codes: n.bioregion_codes,
          thematic_domain: 'community-governance' as const,
          topic_tags: n.is_coordinator ? ['coordinator', 'koi-net'] : ['leaf-node', 'koi-net'],
          maintainers: [],
          repo_url: '',
          quartz_url: null,
          agent_endpoint: null,
          hosting: null,
          federation_version: null,
          schema_version: n.health?.schema_version ?? null,
          bridges: [],
          interaction_channels: {},
          created_at: new Date().toISOString(),
        }));
    }
    const seedNodes = seedImports?.seedNodes ?? [];
    return seedNodes.filter((n: NodeEntry) =>
      n.bioregion_codes.includes(selectedBioregion)
    );
  }, [selectedBioregion, nodesData]);

  // If drilled into an ecoregion, filter nodes to that ecoregion (match by name or id)
  const displayedNodes = useMemo(() => {
    if (activeEcoregion) {
      return allBioregionNodes.filter((n) => {
        const gc = n.geo_classification;
        if (!gc) return false;
        // Match by eco_id or by ecoregion name (handles seed vs API data)
        return gc.ecoregion_id === activeEcoregion.eco_id ||
          gc.ecoregion === activeEcoregion.eco_name;
      });
    }
    return allBioregionNodes;
  }, [allBioregionNodes, activeEcoregion]);

  // Count nodes per ecoregion for badges
  const nodeCountByEco = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const eco of ecoregions) {
      const count = allBioregionNodes.filter((n) => {
        const gc = n.geo_classification;
        if (!gc) return false;
        return gc.ecoregion_id === eco.eco_id || gc.ecoregion === eco.eco_name;
      }).length;
      if (count > 0) counts[eco.eco_id] = count;
    }
    return counts;
  }, [allBioregionNodes, ecoregions]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEcoregion !== null) {
          setSelectedEcoregion(null);
        } else if (selectedBioregion) {
          setSelectedBioregion(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBioregion, selectedEcoregion, setSelectedBioregion, setSelectedEcoregion]);

  // Reset ecoregion selection when bioregion changes
  useEffect(() => {
    setSelectedEcoregion(null);
  }, [selectedBioregion, setSelectedEcoregion]);

  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedEcoregion(null);
        setSelectedBioregion(null);
      }
    },
    [setSelectedBioregion, setSelectedEcoregion]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedEcoregion(null);
      setSelectedBioregion(null);
      setTimeout(() => setSelectedNode(nodeId), 150);
    },
    [setSelectedBioregion, setSelectedEcoregion, setSelectedNode]
  );

  const flyTo = useGlobeStore((s) => s.flyTo);

  const handleEcoregionClick = useCallback(
    (ecoId: number) => {
      setSelectedEcoregion(ecoId);
      // Fly to the bioregion centroid at a closer zoom level
      // The EcoregionLayer will handle the exact centroid if available
      if (bioregion) {
        flyTo(bioregion.centroid[1], bioregion.centroid[0], 1.6);
      }
    },
    [setSelectedEcoregion, flyTo, bioregion]
  );

  const handleBackToBioregion = useCallback(() => {
    setSelectedEcoregion(null);
  }, [setSelectedEcoregion]);

  const realmColor = bioregion ? REALM_COLORS[bioregion.realm] : '#7F8C8D';

  // Biome color mapping for visual variety
  const biomeColor = (biome: string) => {
    if (biome.includes('Conifer')) return '#2ECC71';
    if (biome.includes('Broadleaf')) return '#27AE60';
    if (biome.includes('Mediterranean')) return '#E67E22';
    if (biome.includes('Grassland') || biome.includes('Savanna')) return '#F1C40F';
    if (biome.includes('Desert') || biome.includes('Xeric')) return '#E74C3C';
    if (biome.includes('Tropical')) return '#1ABC9C';
    if (biome.includes('Tundra') || biome.includes('Boreal')) return '#95A5A6';
    if (biome.includes('Mangrove')) return '#16A085';
    if (biome.includes('Flooded')) return '#3498DB';
    if (biome.includes('Montane')) return '#8E44AD';
    return '#3498DB';
  };

  // Different animation variants for mobile (slide up) vs desktop (slide left)
  const panelVariants = isMobile
    ? {
        initial: { y: '100%', opacity: 0.6 },
        animate: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 },
      }
    : {
        initial: { x: '-100%', opacity: 0.6 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
      };

  return (
    <AnimatePresence mode="wait">
      {bioregion && (
        <>
          {/* Backdrop — only captures clicks on mobile (dark overlay), desktop is passthrough */}
          <motion.div
            key="bioregion-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent sm:pointer-events-none"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key={`bioregion-panel-${bioregion.code}`}
            ref={panelRef}
            {...panelVariants}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={[
              'fixed z-50 overflow-y-auto overscroll-contain touch-pan-y',
              'sm:left-0 sm:top-0 sm:h-full sm:w-[380px]',
              'max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[85vh] max-sm:rounded-t-2xl',
              'bg-gray-900/95 backdrop-blur-xl',
              'sm:border-r border-gray-700/30',
              'max-sm:border-t max-sm:border-gray-700/30',
              'shadow-2xl shadow-black/30',
            ].join(' ')}
            style={{ borderRightColor: isMobile ? undefined : `${realmColor}30` }}
            role="dialog"
            aria-label={activeEcoregion ? `Ecoregion: ${activeEcoregion.eco_name}` : `Bioregion: ${bioregion.name}`}
            aria-modal="true"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-gray-600" />
            </div>

            {/* Close button */}
            <button
              onClick={() => { setSelectedEcoregion(null); setSelectedBioregion(null); }}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors cursor-pointer focus-ring"
              aria-label="Close panel"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {activeEcoregion ? (
                /* ─── Ecoregion Detail View ──────────────────────────── */
                <motion.div
                  key={`eco-${activeEcoregion.eco_id}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.2 }}
                >
                  <EcoregionDetailView
                    ecoregion={activeEcoregion}
                    bioregion={bioregion}
                    realmColor={realmColor}
                    biomeColor={biomeColor(activeEcoregion.biome)}
                    nodes={displayedNodes}
                    onBack={handleBackToBioregion}
                    onNodeClick={handleNodeClick}
                  />
                </motion.div>
              ) : (
                /* ─── Bioregion Overview ─────────────────────────────── */
                <motion.div
                  key={`bio-${bioregion.code}`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="p-6 pb-4 max-sm:p-4 max-sm:pb-3">
                    {/* Holonic breadcrumb */}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono mb-2">
                      <span>{bioregion.realm}</span>
                      <ChevronRight />
                      <span>{bioregion.subrealm}</span>
                      <ChevronRight />
                      <span className="text-gray-300">{bioregion.code}</span>
                    </div>

                    {/* Realm badge */}
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3"
                      style={{
                        backgroundColor: `${realmColor}15`,
                        border: `1px solid ${realmColor}30`,
                      }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: realmColor }} aria-hidden="true" />
                      <span className="text-xs font-medium" style={{ color: realmColor }}>
                        {bioregion.realm}
                      </span>
                    </div>

                    {/* Bioregion name */}
                    <h2 className="text-xl max-sm:text-lg font-bold text-white leading-tight pr-8">
                      {bioregion.name}
                    </h2>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 font-mono">
                      <span>{bioregion.code}</span>
                      <span className="text-gray-600" aria-hidden="true">·</span>
                      <span>{bioregion.subrealm}</span>
                    </div>

                    {/* Coordinates */}
                    <div className="mt-2 text-xs text-gray-500">
                      Centroid: {bioregion.centroid[1].toFixed(2)}°N, {bioregion.centroid[0].toFixed(2)}°E
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px mx-6 max-sm:mx-4"
                    style={{
                      background: `linear-gradient(to right, transparent, ${realmColor}25, transparent)`,
                    }}
                    aria-hidden="true"
                  />

                  {/* Ecoregions section */}
                  {showEcoregions && (
                    <div className="p-6 pt-4 pb-2 max-sm:p-4 max-sm:pt-3 max-sm:pb-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                          Ecoregions
                        </h3>
                        {!ecoLoading && (
                          <span
                            className="text-xs font-mono px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${realmColor}15`,
                              color: realmColor,
                            }}
                          >
                            {ecoregions.length}
                          </span>
                        )}
                      </div>

                      {ecoLoading ? (
                        /* Loading state */
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.04] animate-pulse">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-gray-700" />
                                <div className="h-3 bg-gray-700 rounded w-3/4" />
                              </div>
                              <div className="mt-2 ml-4">
                                <div className="h-2.5 bg-gray-800 rounded w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : ecoregions.length > 0 ? (
                        <div className="space-y-2">
                          {ecoregions.map((eco) => (
                            <EcoregionListItem
                              key={eco.eco_id}
                              ecoregion={eco}
                              biomeColor={biomeColor(eco.biome)}
                              nodeCount={nodeCountByEco[eco.eco_id] || 0}
                              onClick={() => handleEcoregionClick(eco.eco_id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 py-2">
                          No ecoregion data available for this bioregion.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Divider between ecoregions and commons */}
                  {showEcoregions && (
                    <div
                      className="h-px mx-6 max-sm:mx-4"
                      style={{
                        background: `linear-gradient(to right, transparent, ${realmColor}15, transparent)`,
                      }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Knowledge Commons list */}
                  <div className="p-6 pt-4 max-sm:p-4 max-sm:pt-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                        Knowledge Commons
                      </h3>
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: displayedNodes.length > 0 ? `${realmColor}15` : 'rgba(255,255,255,0.05)',
                          color: displayedNodes.length > 0 ? realmColor : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {displayedNodes.length}
                      </span>
                    </div>

                    {displayedNodes.length === 0 ? (
                      <EmptyState realmColor={realmColor} bioregionName={bioregion.name} />
                    ) : (
                      <div className="space-y-3 max-sm:space-y-2">
                        {displayedNodes.map((node) => (
                          <NodeListItem
                            key={node.node_id}
                            node={node}
                            onClick={() => handleNodeClick(node.node_id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom gradient */}
                  <div className="sticky bottom-0 h-8 bg-gradient-to-t from-gray-900/95 to-transparent pointer-events-none" aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Ecoregion Detail View ──────────────────────────────────────────
interface EcoregionDetailViewProps {
  ecoregion: EcoregionInfo;
  bioregion: BioregionInfo;
  realmColor: string;
  biomeColor: string;
  nodes: NodeEntry[];
  onBack: () => void;
  onNodeClick: (nodeId: string) => void;
}

function EcoregionDetailView({ ecoregion, bioregion, realmColor, biomeColor, nodes, onBack, onNodeClick }: EcoregionDetailViewProps) {
  const mapColor = getEcoColor(ecoregion.eco_id);

  return (
    <>
      {/* Header */}
      <div className="p-6 pb-4 max-sm:p-4 max-sm:pb-3">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-3 cursor-pointer focus-ring group"
          aria-label={`Back to ${bioregion.name}`}
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>{bioregion.name}</span>
        </button>

        {/* Holonic breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono mb-2 flex-wrap">
          <span>{bioregion.realm}</span>
          <ChevronRight />
          <span>{bioregion.subrealm}</span>
          <ChevronRight />
          <span>{bioregion.code}</span>
          <ChevronRight />
          <span className="text-cyan-400">Ecoregion</span>
        </div>

        {/* Map color + Biome badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Map color badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{
              backgroundColor: `${mapColor}15`,
              border: `1px solid ${mapColor}30`,
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-gray-800" style={{ backgroundColor: mapColor }} aria-hidden="true" />
            <span className="text-xs font-medium" style={{ color: mapColor }}>
              On Map
            </span>
          </div>
          {/* Biome badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{
              backgroundColor: `${biomeColor}15`,
              border: `1px solid ${biomeColor}30`,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: biomeColor }} aria-hidden="true" />
            <span className="text-xs font-medium" style={{ color: biomeColor }}>
              {ecoregion.biome}
            </span>
          </div>
        </div>

        {/* Ecoregion name */}
        <h2 className="text-xl max-sm:text-lg font-bold text-white leading-tight pr-8">
          {ecoregion.eco_name}
        </h2>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 font-mono">
          <span>ECO-{ecoregion.eco_id}</span>
          <span className="text-gray-600" aria-hidden="true">·</span>
          <span style={{ color: realmColor }}>{bioregion.name}</span>
        </div>

        {/* Holonic path visualization */}
        <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">
            Holonic Path
          </div>
          <div className="flex items-center gap-1 text-[11px] flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-400">{bioregion.realm}</span>
            <ChevronRight />
            <span className="px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-400">{bioregion.subrealm}</span>
            <ChevronRight />
            <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${realmColor}15`, color: realmColor }}>{bioregion.name}</span>
            <ChevronRight />
            <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${biomeColor}15`, color: biomeColor }}>{ecoregion.eco_name}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        className="h-px mx-6 max-sm:mx-4"
        style={{
          background: `linear-gradient(to right, transparent, ${biomeColor}25, transparent)`,
        }}
        aria-hidden="true"
      />

      {/* Knowledge Commons in this ecoregion */}
      <div className="p-6 pt-4 max-sm:p-4 max-sm:pt-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
            Knowledge Commons
          </h3>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: nodes.length > 0 ? `${biomeColor}15` : 'rgba(255,255,255,0.05)',
              color: nodes.length > 0 ? biomeColor : 'rgba(255,255,255,0.3)',
            }}
          >
            {nodes.length}
          </span>
        </div>

        {nodes.length === 0 ? (
          <EcoregionEmptyState biomeColor={biomeColor} ecoName={ecoregion.eco_name} />
        ) : (
          <div className="space-y-3 max-sm:space-y-2">
            {nodes.map((node) => (
              <NodeListItem
                key={node.node_id}
                node={node}
                onClick={() => onNodeClick(node.node_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom gradient */}
      <div className="sticky bottom-0 h-8 bg-gradient-to-t from-gray-900/95 to-transparent pointer-events-none" aria-hidden="true" />
    </>
  );
}

// ─── Ecoregion List Item ────────────────────────────────────────────
interface EcoregionListItemProps {
  ecoregion: EcoregionInfo;
  biomeColor: string;
  nodeCount: number;
  onClick: () => void;
}

function EcoregionListItem({ ecoregion, biomeColor, nodeCount, onClick }: EcoregionListItemProps) {
  // Use the same deterministic color as the globe polygons
  const mapColor = getEcoColor(ecoregion.eco_id);

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left rounded-xl p-3
        bg-white/[0.03] hover:bg-white/[0.07]
        border border-white/[0.06] hover:border-white/[0.12]
        transition-all duration-200 group cursor-pointer focus-ring
      "
      style={{ borderLeftWidth: 3, borderLeftColor: `${mapColor}60` }}
      aria-label={`View ${ecoregion.eco_name} ecoregion`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0 ring-2 ring-gray-800"
              style={{ backgroundColor: mapColor }}
              title="Color on map"
              aria-hidden="true"
            />
            <h4 className="text-sm max-sm:text-[13px] font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
              {ecoregion.eco_name}
            </h4>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-[18px]">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${biomeColor}12`,
                color: biomeColor,
                border: `1px solid ${biomeColor}20`,
              }}
            >
              {ecoregion.biome}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {nodeCount > 0 && (
            <span className="text-[10px] font-mono text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
              {nodeCount} commons
            </span>
          )}
          {/* Arrow */}
          <svg
            className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── Node List Item ──────────────────────────────────────────────────────
interface NodeListItemProps {
  node: NodeEntry;
  onClick: () => void;
}

function NodeListItem({ node, onClick }: NodeListItemProps) {
  const domainColor = DOMAIN_COLORS[node.thematic_domain];
  const domainLabel = node.thematic_domain
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left rounded-xl p-4 max-sm:p-3
        bg-white/[0.03] hover:bg-white/[0.07]
        border border-white/[0.06] hover:border-white/[0.12]
        transition-all duration-200 group cursor-pointer focus-ring
      "
      aria-label={`View ${node.display_name} details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm max-sm:text-[13px] font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
            {node.display_name}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${domainColor}15`,
                color: domainColor,
                border: `1px solid ${domainColor}25`,
              }}
            >
              {domainLabel}
            </span>
            {node.topic_tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
          {/* Ecoregion tag if available */}
          {node.geo_classification?.ecoregion && (
            <p className="text-[10px] text-cyan-600/60 mt-1.5 truncate flex items-center gap-1">
              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {node.geo_classification.ecoregion}
            </p>
          )}
          {/* Maintainers */}
          {node.maintainers.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-2 truncate">
              {node.maintainers.join(', ')}
            </p>
          )}
        </div>

        {/* Arrow */}
        <svg
          className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// ─── Empty State — Bioregion ────────────────────────────────────────────
function EmptyState({ realmColor, bioregionName }: { realmColor: string; bioregionName: string }) {
  return (
    <div className="text-center py-8 max-sm:py-6">
      <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4" aria-hidden="true">
        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>
      <p className="text-sm text-gray-400 mb-1">No knowledge commons yet</p>
      <p className="text-xs text-gray-500 mb-4 max-w-[240px] mx-auto">
        Be the first to start a knowledge commons in {bioregionName}
      </p>
      <button
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer focus-ring"
        style={{ backgroundColor: `${realmColor}15`, color: realmColor, border: `1px solid ${realmColor}30` }}
        aria-label={`Start a knowledge commons in ${bioregionName}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Start a Commons
      </button>
    </div>
  );
}

// ─── Empty State — Ecoregion ────────────────────────────────────────────
function EcoregionEmptyState({ biomeColor, ecoName }: { biomeColor: string; ecoName: string }) {
  return (
    <div className="text-center py-8 max-sm:py-6">
      <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4" aria-hidden="true">
        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </div>
      <p className="text-sm text-gray-400 mb-1">No knowledge commons yet</p>
      <p className="text-xs text-gray-500 mb-4 max-w-[240px] mx-auto">
        Be the first to start a knowledge commons in the {ecoName} ecoregion
      </p>
      <button
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer focus-ring"
        style={{ backgroundColor: `${biomeColor}15`, color: biomeColor, border: `1px solid ${biomeColor}30` }}
        aria-label={`Start a knowledge commons in ${ecoName}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Start a Commons
      </button>
    </div>
  );
}

// ─── Shared small chevron icon ──────────────────────────────────────────
function ChevronRight() {
  return (
    <svg className="w-2.5 h-2.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
