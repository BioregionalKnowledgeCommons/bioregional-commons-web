'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';

const STORAGE_KEY = 'welcome-dismissed';

export default function WelcomeTile() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Delay entry by 1.5s so the globe loads first
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed !== 'true') {
        setShowWelcome(true);
      }
      setReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    // Notify other components (e.g. FindMyBioregion) that welcome is gone
    window.dispatchEvent(new Event('welcome-dismissed'));
  }, []);

  const handleExplore = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleStartCommons = useCallback(() => {
    dismiss();
    useGlobeStore.getState().setShowOnboarding(true);
  }, [dismiss]);

  // Expose a way to re-show the tile (called from help button in page.tsx)
  // We use a custom event pattern for this
  useEffect(() => {
    const handleReshow = () => setShowWelcome(true);
    window.addEventListener('reshow-welcome', handleReshow);
    return () => window.removeEventListener('reshow-welcome', handleReshow);
  }, []);

  if (!ready) return null;

  return (
    <AnimatePresence>
      {showWelcome && (
        <>
          {/* Backdrop — click to dismiss */}
          <motion.div
            key="welcome-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[39]"
            onClick={dismiss}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            key="welcome-card"
            role="dialog"
            aria-label="Welcome to the Bioregional Knowledge Commons"
            aria-modal="false"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260, delay: 0.05 }}
            className="
              fixed bottom-24 left-1/2 -translate-x-1/2 z-40
              w-[440px] max-w-[calc(100vw-2rem)]
              max-sm:bottom-20 max-sm:left-4 max-sm:right-4 max-sm:translate-x-0 max-sm:w-auto
              bg-gray-900/90 backdrop-blur-xl
              border border-gray-700/30
              rounded-2xl shadow-2xl shadow-black/40
              p-6
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Globe icon */}
            <div className="flex justify-center mb-3">
              <div className="h-10 w-10 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
                <span className="text-lg" role="img" aria-label="Globe">
                  🌍
                </span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-base font-semibold text-white mb-2 tracking-wide">
              Welcome to the Bioregional Knowledge Commons
            </h2>

            {/* Description */}
            <p className="text-center text-sm text-gray-400 leading-relaxed mb-4">
              A federated network of KOI nodes sharing ecological knowledge,
              governance practices, and community wisdom across bioregions.
              4 live nodes are currently federating data via the KOI-net protocol.
              Explore the globe, discover nodes near you, or start your own.
            </p>

            {/* Stat badges */}
            <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
              <StatBadge label="185 Bioregions" />
              <span className="text-gray-600" aria-hidden="true">·</span>
              <StatBadge label="4 Live Nodes" />
              <span className="text-gray-600" aria-hidden="true">·</span>
              <StatBadge label="KOI-net Federation" />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExplore}
                className="
                  flex-1 py-2.5 rounded-xl text-sm font-semibold
                  bg-gradient-to-r from-cyan-500 to-teal-400
                  text-gray-950
                  shadow-lg shadow-cyan-500/20
                  hover:shadow-cyan-500/40 hover:brightness-110
                  active:scale-[0.98]
                  transition-all duration-150
                  cursor-pointer focus-ring
                "
              >
                Explore the Globe
              </button>
              <button
                onClick={handleStartCommons}
                className="
                  flex-1 py-2.5 rounded-xl text-sm font-semibold
                  border border-gray-600/50
                  text-gray-300
                  hover:border-gray-500 hover:text-white hover:bg-gray-800/40
                  active:scale-[0.98]
                  transition-all duration-150
                  cursor-pointer focus-ring
                "
              >
                Start a Commons
              </button>
            </div>

            {/* Click-through hint */}
            <p className="text-center text-[11px] text-gray-600 mt-3 select-none">
              Click anywhere to explore
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Small stat badge ─────────────────────────────────────────────── */
function StatBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-400 bg-gray-800/60 border border-gray-700/40">
      {label}
    </span>
  );
}
