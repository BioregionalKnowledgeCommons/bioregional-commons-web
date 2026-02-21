'use client';

import { useMemo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { assetPath } from '@/lib/constants';
import { REALM_COLORS, type BioregionInfo, type BioregionLookup } from '@/types';
import { LIVE_ONLY } from '@/lib/feature-flags';
import { useNodes } from '@/hooks/useNodes';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

export default function BioregionTooltip() {
  const hoveredBioregion = useGlobeStore((s) => s.hoveredBioregion);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [fullLookup, setFullLookup] = useState<BioregionLookup>({});
  const { data: nodesData } = useNodes();

  // Load full bioregion lookup (all 185 bioregions)
  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((res) => res.json())
      .then((data: BioregionLookup) => setFullLookup(data))
      .catch(() => {});
  }, []);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const bioregion = useMemo((): BioregionInfo | null => {
    if (!hoveredBioregion) return null;
    return fullLookup[hoveredBioregion] ?? null;
  }, [hoveredBioregion, fullLookup]);

  const nodeCount = useMemo(() => {
    if (!hoveredBioregion) return 0;
    if (LIVE_ONLY) {
      const liveNodes = nodesData?.nodes ?? [];
      return liveNodes.filter((n) =>
        n.bioregion_codes.includes(hoveredBioregion)
      ).length;
    }
    const seedNodes = seedImports?.seedNodes ?? [];
    return seedNodes.filter((n: { bioregion_codes: string[] }) =>
      n.bioregion_codes.includes(hoveredBioregion)
    ).length;
  }, [hoveredBioregion, nodesData]);

  // Position tooltip with offset, keeping it in viewport
  const tooltipStyle = useMemo(() => {
    const offsetX = 16;
    const offsetY = 16;
    const tooltipWidth = 220;
    const tooltipHeight = 80;

    let x = mousePos.x + offsetX;
    let y = mousePos.y + offsetY;

    // Prevent going off-screen right
    if (typeof window !== 'undefined') {
      if (x + tooltipWidth > window.innerWidth - 8) {
        x = mousePos.x - tooltipWidth - offsetX;
      }
      // Prevent going off-screen bottom
      if (y + tooltipHeight > window.innerHeight - 8) {
        y = mousePos.y - tooltipHeight - offsetY;
      }
    }

    return { left: x, top: y };
  }, [mousePos]);

  return (
    <AnimatePresence>
      {bioregion && (
        <motion.div
          key="bioregion-tooltip"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[60] pointer-events-none"
          style={tooltipStyle}
        >
          <div className="bg-gray-900/90 backdrop-blur-lg rounded-lg border border-gray-700/40 shadow-xl shadow-black/30 px-3.5 py-2.5 min-w-[180px]">
            {/* Bioregion name */}
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: REALM_COLORS[bioregion.realm],
                }}
              />
              <h4 className="text-sm font-medium text-white truncate">
                {bioregion.name}
              </h4>
            </div>

            {/* Realm + stats */}
            <div className="flex items-center justify-between mt-1.5 gap-4">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${REALM_COLORS[bioregion.realm]}15`,
                  color: REALM_COLORS[bioregion.realm],
                  border: `1px solid ${REALM_COLORS[bioregion.realm]}25`,
                }}
              >
                {bioregion.realm}
              </span>
              <span className="text-xs text-gray-400">
                {nodeCount === 0
                  ? 'No nodes'
                  : nodeCount === 1
                    ? '1 node'
                    : `${nodeCount} nodes`}
              </span>
            </div>

            {/* Code */}
            <div className="mt-1 text-[10px] text-gray-500 font-mono">
              {bioregion.code} · {bioregion.subrealm}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
