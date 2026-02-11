'use client';

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { seedNodes } from '@/data/seed-registry';
import { DOMAIN_COLORS } from '@/types';
import IdentityBlock from './IdentityBlock';
import ActivityBlock from './ActivityBlock';
import ParticipationBlock from './ParticipationBlock';
import AgentChat from './AgentChat';
import StewardshipDashboard from '../dashboard/StewardshipDashboard';

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

export default function NodeCard() {
  const selectedNodeId = useGlobeStore((s) => s.selectedNodeId);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const isMobile = useIsMobile();

  const panelRef = useRef<HTMLDivElement>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const node = useMemo(() => {
    if (!selectedNodeId) return null;
    return seedNodes.find((n) => n.node_id === selectedNodeId) ?? null;
  }, [selectedNodeId]);

  // Close on Escape (handled by useKeyboardNav too, but keep for local isolation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNodeId) {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, setSelectedNode]);

  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedNode(null);
      }
    },
    [setSelectedNode]
  );

  const domainColor = node
    ? DOMAIN_COLORS[node.thematic_domain]
    : '#7F8C8D';

  // Different animation variants for mobile (slide up) vs desktop (slide right)
  const panelVariants = isMobile
    ? {
        initial: { y: '100%', opacity: 0.6 },
        animate: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 },
      }
    : {
        initial: { x: '100%', opacity: 0.6 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
      };

  return (
    <AnimatePresence mode="wait">
      {node && (
        <>
          {/* Backdrop for click-outside */}
          <motion.div
            key="node-card-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Panel — desktop: slide from right; mobile: slide from bottom */}
          <motion.div
            key={`node-card-${node.node_id}`}
            ref={panelRef}
            {...panelVariants}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={[
              'fixed z-50 overflow-y-auto overscroll-contain touch-pan-y',
              // Desktop: right panel
              'sm:right-0 sm:top-0 sm:h-full sm:w-[420px]',
              // Mobile: bottom sheet
              'max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[85vh] max-sm:rounded-t-2xl',
              // Styling
              'bg-gray-900/95 backdrop-blur-xl',
              'sm:border-l border-gray-700/30',
              'max-sm:border-t max-sm:border-gray-700/30',
              'shadow-2xl shadow-black/30',
            ].join(' ')}
            style={{ borderLeftColor: isMobile ? undefined : `${domainColor}30` }}
            role="dialog"
            aria-label={`Node details: ${node.display_name}`}
            aria-modal="true"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-gray-600" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors focus-ring"
              aria-label="Close node card"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Content */}
            <div className="p-6 max-sm:p-4 space-y-6 max-sm:space-y-5 pb-12">
              <IdentityBlock node={node} />

              <div
                className="h-px w-full"
                style={{
                  background: `linear-gradient(to right, transparent, ${domainColor}20, transparent)`,
                }}
                aria-hidden="true"
              />

              <ActivityBlock node={node} />

              <div
                className="h-px w-full"
                style={{
                  background: `linear-gradient(to right, transparent, ${domainColor}20, transparent)`,
                }}
                aria-hidden="true"
              />

              <ParticipationBlock node={node} />

              <div
                className="h-px w-full"
                style={{
                  background: `linear-gradient(to right, transparent, ${domainColor}20, transparent)`,
                }}
                aria-hidden="true"
              />

              <AgentChat node={node} />

              {/* Stewardship Dashboard Button */}
              <div
                className="h-px w-full"
                style={{
                  background: `linear-gradient(to right, transparent, ${domainColor}20, transparent)`,
                }}
                aria-hidden="true"
              />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <button
                  onClick={() => setShowDashboard(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gray-800/60 border border-gray-700/40 hover:bg-gray-700/60 transition-colors flex items-center justify-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                  </svg>
                  Stewardship Dashboard
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium ml-1">
                    Demo
                  </span>
                </button>
              </motion.div>
            </div>

            {/* Subtle gradient at bottom for scroll indication */}
            <div className="sticky bottom-0 h-8 bg-gradient-to-t from-gray-900/95 to-transparent pointer-events-none" aria-hidden="true" />
          </motion.div>

          {/* Dashboard Modal */}
          <AnimatePresence>
            {showDashboard && (
              <StewardshipDashboard node={node} onClose={() => setShowDashboard(false)} />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
