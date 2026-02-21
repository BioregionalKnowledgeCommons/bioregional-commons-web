'use client';

import { useMemo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { seedNodes, seedFlows } from '@/data/seed-registry';
import type { NodeEntry } from '@/types';

// Quick lookup maps
const nodeMap = new Map<string, NodeEntry>();
seedNodes.forEach((n) => nodeMap.set(n.node_id, n));

const FLOW_TYPE_COLORS: Record<string, string> = {
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

  // Resolve flow data
  const flowInfo = useMemo(() => {
    if (!hoveredFlow) return null;

    const sourceNode = nodeMap.get(hoveredFlow.sourceId);
    const targetNode = nodeMap.get(hoveredFlow.targetId);
    if (!sourceNode || !targetNode) return null;

    // Find matching flow data
    const flow = seedFlows.flows.find(
      (f) =>
        f.source_node_id === hoveredFlow.sourceId &&
        f.target_node_id === hoveredFlow.targetId
    );
    if (!flow) return null;

    return {
      sourceName: sourceNode.display_name,
      targetName: targetNode.display_name,
      flowType: flow.flow_type,
      volume: flow.volume,
      lastActivity: flow.last_activity,
      direction: flow.direction,
    };
  }, [hoveredFlow]);

  // Position tooltip with offset, keeping it in viewport
  const tooltipStyle = useMemo(() => {
    const offsetX = 16;
    const offsetY = 16;
    const tooltipWidth = 280;
    const tooltipHeight = 110;

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

  const formattedDate = useMemo(() => {
    if (!flowInfo) return '';
    const date = new Date(flowInfo.lastActivity);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [flowInfo]);

  const color = flowInfo ? FLOW_TYPE_COLORS[flowInfo.flowType] || '#00d4ff' : '#00d4ff';

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

            {/* Flow type badge + volume */}
            <div className="flex items-center justify-between mt-1.5 gap-3">
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
              <span className="text-xs text-gray-400">
                {flowInfo.volume} {flowInfo.volume === 1 ? 'interaction' : 'interactions'}
              </span>
            </div>

            {/* Last activity */}
            <div className="mt-1 text-[10px] text-gray-500 font-mono">
              Last activity: {formattedDate}
              {flowInfo.direction === 'bidirectional' && (
                <span className="ml-2 text-gray-600">⇄ bidirectional</span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
