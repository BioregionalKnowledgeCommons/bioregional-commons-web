'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { useNodes } from '@/hooks/useNodes';
import type { KoiLiveNode } from '@/types';
import { NODE_COLORS } from '@/types';
import OverviewTab from './OverviewTab';
import KnowledgeTab from './KnowledgeTab';
import ChatTab from './ChatTab';
import NetworkTab from './NetworkTab';
import CommonsTab from './CommonsTab';

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

const LIVE_NODE_IDS = new Set([
  'octo-salish-sea',
  'greater-victoria',
  'front-range',
  'cowichan-valley',
]);

const STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  unreachable: '#ef4444',
};

type Tab = 'overview' | 'knowledge' | 'chat' | 'network' | 'commons';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'chat', label: 'Chat' },
  { key: 'network', label: 'Network' },
  { key: 'commons', label: 'Commons' },
];

export default function KnowledgePanel() {
  const selectedNodeId = useGlobeStore((s) => s.selectedNodeId);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: nodesData } = useNodes();

  const node: KoiLiveNode | null =
    selectedNodeId && LIVE_NODE_IDS.has(selectedNodeId)
      ? (nodesData?.nodes.find((n) => n.node_id === selectedNodeId) ?? null)
      : null;

  // Reset to overview when switching nodes — intentional state reset on prop change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActiveTab('overview'); }, [selectedNodeId]);

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

  const statusColor = node ? (STATUS_COLORS[node.status] ?? '#7F8C8D') : '#7F8C8D';
  const nodeColor = node ? (NODE_COLORS[node.node_id] ?? statusColor) : statusColor;

  // Count child nodes for coordinators
  const childNodes = node?.is_coordinator
    ? (nodesData?.nodes.filter(
        (n) => n.node_id !== node.node_id && !n.is_coordinator
      ) ?? [])
    : [];

  const panelVariants = isMobile
    ? { initial: { y: '100%', opacity: 0.6 }, animate: { y: 0, opacity: 1 }, exit: { y: '100%', opacity: 0 } }
    : { initial: { x: '100%', opacity: 0.6 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0 } };

  return (
    <AnimatePresence mode="wait">
      {node && (
        <>
          <motion.div
            key="panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          <motion.div
            key={`panel-${node.node_id}`}
            ref={panelRef}
            {...panelVariants}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={[
              'fixed z-50 flex flex-col',
              'sm:right-0 sm:top-0 sm:h-full sm:w-[460px]',
              'max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[85vh] max-sm:rounded-t-2xl',
              'bg-gray-900/95 backdrop-blur-xl',
              'sm:border-l border-gray-700/30',
              'max-sm:border-t max-sm:border-gray-700/30',
              'shadow-2xl shadow-black/30',
            ].join(' ')}
            style={{ borderLeftColor: isMobile ? undefined : `${nodeColor}30` }}
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

            {/* Header */}
            <div className="px-6 pt-6 pb-3 max-sm:px-4 max-sm:pt-4">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
                />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: statusColor }}>
                  {node.status === 'healthy' ? 'Live' : 'Offline'}
                  {node.is_coordinator && ' · Coordinator'}
                  {childNodes.length > 0 && ` · ${childNodes.length} sub-nodes`}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white">{node.display_name}</h2>
              <p className="text-sm text-gray-400 mt-1">
                KOI Node · {node.bioregion_codes.join(', ')}
              </p>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-700/40 px-6 max-sm:px-4">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'px-3 py-2.5 text-sm font-medium transition-colors relative',
                    activeTab === tab.key
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ backgroundColor: nodeColor }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y">
              {activeTab === 'overview' && (
                <OverviewTab node={node} nodeColor={nodeColor} childNodes={childNodes} />
              )}
              {activeTab === 'knowledge' && (
                <KnowledgeTab nodeId={node.node_id} nodeColor={nodeColor} />
              )}
              {activeTab === 'chat' && (
                <ChatTab nodeId={node.node_id} nodeName={node.display_name} nodeColor={nodeColor} />
              )}
              {activeTab === 'network' && (
                <NetworkTab nodeId={node.node_id} nodeColor={nodeColor} />
              )}
              {activeTab === 'commons' && (
                <CommonsTab nodeId={node.node_id} nodeColor={nodeColor} />
              )}
            </div>

            <div className="sticky bottom-0 h-6 bg-gradient-to-t from-gray-900/95 to-transparent pointer-events-none" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
