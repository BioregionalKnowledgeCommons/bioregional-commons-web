'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { useNodes } from '@/hooks/useNodes';
import { useNodeStats } from '@/hooks/useNodeStats';
import type { KoiLiveNode } from '@/types';

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

const STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  unreachable: '#ef4444',
};

// Known live node IDs (to distinguish from seed nodes)
const LIVE_NODE_IDS = new Set([
  'octo-salish-sea',
  'greater-victoria',
  'front-range',
  'cowichan-valley',
]);

export default function LiveNodeCard() {
  const selectedNodeId = useGlobeStore((s) => s.selectedNodeId);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: nodesData } = useNodes();
  const { data: statsData, isLoading: statsLoading } = useNodeStats(
    selectedNodeId && LIVE_NODE_IDS.has(selectedNodeId) ? selectedNodeId : null
  );

  // Only show for live KOI nodes
  const node: KoiLiveNode | null =
    selectedNodeId && LIVE_NODE_IDS.has(selectedNodeId)
      ? (nodesData?.nodes.find((n) => n.node_id === selectedNodeId) ?? null)
      : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNodeId) setSelectedNode(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, setSelectedNode]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedNode(null);
      }
    },
    [setSelectedNode]
  );

  const color = node ? (STATUS_COLORS[node.status] ?? '#7F8C8D') : '#7F8C8D';

  const panelVariants = isMobile
    ? { initial: { y: '100%', opacity: 0.6 }, animate: { y: 0, opacity: 1 }, exit: { y: '100%', opacity: 0 } }
    : { initial: { x: '100%', opacity: 0.6 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0 } };

  return (
    <AnimatePresence mode="wait">
      {node && (
        <>
          <motion.div
            key="live-card-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          <motion.div
            key={`live-card-${node.node_id}`}
            ref={panelRef}
            {...panelVariants}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={[
              'fixed z-50 overflow-y-auto overscroll-contain touch-pan-y',
              'sm:right-0 sm:top-0 sm:h-full sm:w-[420px]',
              'max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[85vh] max-sm:rounded-t-2xl',
              'bg-gray-900/95 backdrop-blur-xl',
              'sm:border-l border-gray-700/30',
              'max-sm:border-t max-sm:border-gray-700/30',
              'shadow-2xl shadow-black/30',
            ].join(' ')}
            style={{ borderLeftColor: isMobile ? undefined : `${color}30` }}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-gray-600" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6 max-sm:p-4 space-y-6 pb-12">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
                    {node.status === 'healthy' ? 'Live' : 'Offline'}
                    {node.is_coordinator && ' · Coordinator'}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-white">{node.display_name}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  KOI Node · {node.bioregion_codes.join(', ')}
                </p>
              </div>

              <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${color}20, transparent)` }} />

              {/* Health Details */}
              {node.health && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Health</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoChip label="Mode" value={String(node.health.mode ?? '—')} />
                    <InfoChip label="Database" value={String(node.health.database ?? '—')} />
                    <InfoChip label="Embedding" value={String(node.health.embedding_model ?? 'none')} />
                    <InfoChip label="Semantic" value={node.health.semantic_matching ? 'Yes' : 'No'} />
                    <InfoChip label="Schema" value={String(node.health.schema_version ?? '—')} />
                    <InfoChip
                      label="Entity Types"
                      value={String((node.health.entity_types as string[])?.length ?? 0)}
                    />
                  </div>
                </div>
              )}

              <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${color}20, transparent)` }} />

              {/* Stats */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Entity Counts</h3>
                {statsLoading ? (
                  <div className="text-sm text-gray-500">Loading stats...</div>
                ) : statsData?.by_type ? (
                  <div className="space-y-2">
                    {Object.entries(statsData.by_type)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{type}</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 rounded-full bg-blue-500/30"
                              style={{
                                width: `${Math.max(20, (count / Math.max(1, statsData.total_entities)) * 120)}px`,
                              }}
                            >
                              <div
                                className="h-full rounded-full bg-blue-400"
                                style={{
                                  width: `${Math.max(10, (count / Math.max(1, statsData.total_entities)) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-mono text-gray-300 w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    <div className="pt-2 border-t border-gray-700/30 flex justify-between text-sm">
                      <span className="text-gray-400">Total</span>
                      <span className="font-mono text-white">{statsData.total_entities}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No stats available</div>
                )}
              </div>

              {/* Capabilities */}
              <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${color}20, transparent)` }} />
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(node.capabilities).map(([cap, enabled]) => (
                    <span
                      key={cap}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        enabled
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-gray-700/30 border-gray-600/30 text-gray-500'
                      }`}
                    >
                      {cap.replace('supports_', '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 h-8 bg-gradient-to-t from-gray-900/95 to-transparent pointer-events-none" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-200 font-mono truncate">{value}</div>
    </div>
  );
}
