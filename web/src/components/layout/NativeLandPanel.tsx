'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import type { NativeLandType } from '@/types';

// ─── Type-specific styling ─────────────────────────────────────────────

const TYPE_CONFIG: Record<NativeLandType, { label: string; icon: React.ReactNode; accentColor: string }> = {
  territories: {
    label: 'Indigenous Territory',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    accentColor: '#10b981', // emerald
  },
  languages: {
    label: 'Indigenous Language',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
      </svg>
    ),
    accentColor: '#8b5cf6', // violet
  },
  treaties: {
    label: 'Treaty / Land Agreement',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    accentColor: '#f59e0b', // amber
  },
};

// ─── Detect mobile viewport ────────────────────────────────────────────

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

// ─── Main Panel Component ──────────────────────────────────────────────

export default function NativeLandPanel() {
  const selectedNativeLand = useGlobeStore((s) => s.selectedNativeLand);
  const setSelectedNativeLand = useGlobeStore((s) => s.setSelectedNativeLand);
  const isMobile = useIsMobile();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNativeLand) {
        setSelectedNativeLand(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNativeLand, setSelectedNativeLand]);

  const handleClose = useCallback(() => {
    setSelectedNativeLand(null);
  }, [setSelectedNativeLand]);

  const handleOpenNativeLand = useCallback(() => {
    if (selectedNativeLand) {
      window.open(selectedNativeLand.feature.properties.description, '_blank');
    }
  }, [selectedNativeLand]);

  if (!selectedNativeLand) return null;

  const { type, feature } = selectedNativeLand;
  const config = TYPE_CONFIG[type];
  const featureColor = feature.properties.color || config.accentColor;

  // Animation variants
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
      <motion.div
        key={`native-land-${feature.id}`}
        {...panelVariants}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={[
          'fixed z-50 overflow-y-auto overscroll-contain touch-pan-y',
          'sm:right-0 sm:top-0 sm:h-full sm:w-[360px]',
          'max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[70vh] max-sm:rounded-t-2xl',
          'bg-gray-900/95 backdrop-blur-xl',
          'sm:border-l border-gray-700/30',
          'max-sm:border-t max-sm:border-gray-700/30',
          'shadow-2xl shadow-black/30',
        ].join(' ')}
        style={{ borderLeftColor: isMobile ? undefined : `${featureColor}30` }}
        role="dialog"
        aria-label={`${config.label}: ${feature.properties.Name}`}
        aria-modal="true"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors cursor-pointer focus-ring"
          aria-label="Close panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-4 max-sm:p-4 max-sm:pb-3">
          {/* Native Land Digital badge */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mb-3">
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              Native Land Digital
            </span>
          </div>

          {/* Type badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-3"
            style={{
              backgroundColor: `${config.accentColor}15`,
              border: `1px solid ${config.accentColor}30`,
            }}
          >
            <span style={{ color: config.accentColor }}>{config.icon}</span>
            <span className="text-xs font-medium" style={{ color: config.accentColor }}>
              {config.label}
            </span>
          </div>

          {/* Feature name */}
          <h2 className="text-xl max-sm:text-lg font-bold text-white leading-tight pr-10">
            {feature.properties.Name}
          </h2>

          {/* Color swatch */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className="w-4 h-4 rounded-full border-2 border-gray-700"
              style={{ backgroundColor: featureColor }}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-500 font-mono">
              Map Color: {featureColor}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px mx-6 max-sm:mx-4"
          style={{
            background: `linear-gradient(to right, transparent, ${config.accentColor}25, transparent)`,
          }}
          aria-hidden="true"
        />

        {/* Info section */}
        <div className="p-6 pt-4 max-sm:p-4 max-sm:pt-3 space-y-4">
          {/* Acknowledgment */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Land Acknowledgment
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              This {type === 'territories' ? 'territory' : type === 'languages' ? 'language region' : 'treaty area'} is
              part of the traditional lands of the <strong className="text-white">{feature.properties.Name}</strong>.
              {type === 'territories' && ' We acknowledge and honor the Indigenous peoples who have been stewards of this land since time immemorial.'}
              {type === 'languages' && ' This represents an area where this Indigenous language has been spoken historically and continues to be preserved.'}
              {type === 'treaties' && ' This represents a formal agreement between Indigenous nations and colonial or national governments.'}
            </p>
          </div>

          {/* Data notice */}
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-[11px] text-amber-300/70 leading-relaxed">
              <strong>Note:</strong> This map does not represent official or legal boundaries of any Indigenous nations.
              Native Land Digital compiles this data from various sources with input from Indigenous communities.
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={handleOpenNativeLand}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer focus-ring group"
            style={{
              backgroundColor: `${config.accentColor}15`,
              color: config.accentColor,
              border: `1px solid ${config.accentColor}30`,
            }}
            aria-label={`Learn more about ${feature.properties.Name} on Native Land Digital`}
          >
            <span>Learn More on Native Land Digital</span>
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>

        {/* Attribution footer */}
        <div className="px-6 py-4 max-sm:px-4 max-sm:py-3 border-t border-gray-800/50">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Data provided by{' '}
            <a
              href="https://native-land.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 underline transition-colors"
            >
              Native Land Digital
            </a>
            . Please visit their site for the most current information and to support their mission of Indigenous land acknowledgment.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
