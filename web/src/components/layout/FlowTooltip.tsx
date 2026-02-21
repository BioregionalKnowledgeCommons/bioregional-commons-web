'use client';

import { useMemo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { LIVE_ONLY } from '@/lib/feature-flags';

// Only import seed data when not in LIVE_ONLY mode (tree-shaken in production)
const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

const EDGE_TYPE_COLORS: Record<string, string> = {
  POLL: '#60a5fa',
  PUSH: '#22c55e',
  contribution: '#00d4ff',
  fork: '#ffa500',
};

export default function FlowTooltip() {
  const hoveredFlow = useGlobeStore((s) => s.hoveredFlow);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Resolve flow data — in LIVE_ONLY mode, show federation edge info
  const flowInfo = useMemo(() => {
    if (!hoveredFlow) return null;

    if (LIVE_ONLY) {
      // Federation edge tooltip: rich data from FederationArcs hover
      return {
        sourceName: hoveredFlow.sourceName ?? hoveredFlow.sourceId,
        targetName: hoveredFlow.targetName ?? hoveredFlow.targetId,
        flowType: hoveredFlow.edgeType ?? 'POLL',
      };
    }

    // Legacy seed flow tooltip
    if (!seedImports) return null;
    const { seedNodes, seedFlows } = seedImports;
    const nodeMap = new Map(seedNodes.map((n: { node_id: string }) => [n.node_id, n]));
    const sourceNode = nodeMap.get(hoveredFlow.sourceId) as { display_name: string } | undefined;
    const targetNode = nodeMap.get(hoveredFlow.targetId) as { display_name: string } | undefined;
    if (!sourceNode || !targetNode) return null;

    const flow = seedFlows.flows.find(
      (f: { source_node_id: string; target_node_id: string }) =>
        f.source_node_id === hoveredFlow.sourceId &&
        f.target_node_id === hoveredFlow.targetId
    );
    if (!flow) return null;

    return {
      sourceName: sourceNode.display_name,
      targetName: targetNode.display_name,
      flowType: flow.flow_type as string,
    };
  }, [hoveredFlow]);

  // Position tooltip with offset, keeping it in viewport
  const tooltipStyle = useMemo(() => {
    const offsetX = 16;
    const offsetY = 16;
    const tooltipWidth = 280;
    const tooltipHeight = 80;

    let x = mousePos.x + offsetX;
    let y = mousePos.y + offsetY;

    if (typeof window !== 'undefined') {
      if (x + tooltipWidth > window.innerWidth - 8) {
        x = mousePos.x - tooltipWidth - offsetX;
      }
      if (y + tooltipHeight > window.innerHeight - 8) {
        y = mousePos.y - tooltipHeight - offsetY;
      }
    }

    return { left: x, top: y };
  }, [mousePos]);

  const color = flowInfo ? EDGE_TYPE_COLORS[flowInfo.flowType] || '#60a5fa' : '#60a5fa';

  return (
    <AnimatePresence>
      {flowInfo && (
        <motion.div
          key="flow-tooltip"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[60] pointer-events-none"
          style={tooltipStyle}
        >
          <div className="bg-gray-900/90 backdrop-blur-lg rounded-lg border border-gray-700/40 shadow-xl shadow-black/30 px-3.5 py-2.5 min-w-[200px] max-w-[300px]">
            {/* Source → Target */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-white/90 font-medium truncate max-w-[110px]">
                {flowInfo.sourceName}
              </span>
              <span style={{ color }} className="flex-shrink-0 text-xs">
                →
              </span>
              <span className="text-white/90 font-medium truncate max-w-[110px]">
                {flowInfo.targetName}
              </span>
            </div>

            {/* Edge type badge */}
            <div className="flex items-center mt-1.5">
              <span
                className="text-xs px-1.5 py-0.5 rounded capitalize"
                style={{
                  backgroundColor: `${color}15`,
                  color,
                  border: `1px solid ${color}25`,
                }}
              >
                {flowInfo.flowType}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
