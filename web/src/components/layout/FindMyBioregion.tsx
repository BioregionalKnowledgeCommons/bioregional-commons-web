'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useBioregionDetection } from '@/hooks/useBioregionDetection';
import { REALM_COLORS } from '@/types';
import { LIVE_ONLY } from '@/lib/feature-flags';
import { useNodes } from '@/hooks/useNodes';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');
import { GlassCard } from '@/components/ui';
import { useGlobeStore } from '@/stores/globeStore';

const DISMISSED_KEY = 'bioregion-prompt-dismissed';

const WELCOME_STORAGE_KEY = 'welcome-dismissed';

export function FindMyBioregion() {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash
  const [welcomeActive, setWelcomeActive] = useState(true); // Hide while welcome tile is up
  const { location, error, isLoading, requestLocation } = useGeolocation();
  const { bioregion, distance, isDetecting } = useBioregionDetection(
    location?.lat ?? null,
    location?.lng ?? null
  );
  const flyTo = useGlobeStore((s) => s.flyTo);
  const setSelectedBioregion = useGlobeStore((s) => s.setSelectedBioregion);
  const { data: nodesData } = useNodes();

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasDismissed = localStorage.getItem(DISMISSED_KEY);
    setDismissed(wasDismissed === 'true'); // eslint-disable-line react-hooks/set-state-in-effect

    // Don't show if the welcome tile is still active
    const welcomeDismissed = localStorage.getItem(WELCOME_STORAGE_KEY);
    setWelcomeActive(welcomeDismissed !== 'true');

    // Listen for when the welcome tile gets dismissed
    const handleWelcomeDismissed = () => setWelcomeActive(false);
    window.addEventListener('welcome-dismissed', handleWelcomeDismissed);
    return () => window.removeEventListener('welcome-dismissed', handleWelcomeDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Storage unavailable
    }
  };

  const handleZoom = () => {
    if (!bioregion) return;
    const [lng, lat] = bioregion.centroid;
    // Fly the camera to the bioregion centroid
    flyTo(lat, lng, 2.0);
    // Open the bioregion panel
    setSelectedBioregion(bioregion.code);
    // Dismiss the prompt
    handleDismiss();
  };

  // Count nodes in detected bioregion
  const nodesInBioregion = useMemo(() => {
    if (!bioregion) return [];
    if (LIVE_ONLY) {
      const liveNodes = nodesData?.nodes ?? [];
      return liveNodes.filter((n) => n.bioregion_codes.includes(bioregion.code));
    }
    const seedNodes = seedImports?.seedNodes ?? [];
    return seedNodes.filter((n: { bioregion_codes: string[] }) => n.bioregion_codes.includes(bioregion.code));
  }, [bioregion, nodesData]);

  const hasLocation = location !== null;
  const hasDetected = bioregion !== null;
  const isVisible = !dismissed && !welcomeActive;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="
            fixed bottom-6 left-1/2 -translate-x-1/2 z-40
            w-[calc(100%-2rem)] max-w-md
            sm:bottom-8
          "
        >
          <GlassCard className="p-5 relative overflow-hidden">
            {/* Decorative gradient edge */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            {!hasLocation && !error && (
              /* ---- Initial prompt ---- */
              <div className="flex flex-col items-center text-center gap-3">
                {/* Location pin icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-400/20">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-cyan-400"
                  >
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white">
                    Find your bioregion
                  </h3>
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">
                    Share your location to discover the knowledge commons near you
                  </p>
                </div>

                <div className="flex gap-3 mt-1">
                  <button
                    onClick={requestLocation}
                    disabled={isLoading}
                    aria-label="Share your location to find your bioregion"
                    className="
                      rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-gray-950
                      hover:bg-cyan-400 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                      cursor-pointer focus-ring
                    "
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-950/30 border-t-gray-950" />
                        Locating...
                      </span>
                    ) : (
                      'Share Location'
                    )}
                  </button>
                  <button
                    onClick={handleDismiss}
                    aria-label="Dismiss location prompt"
                    className="
                      rounded-lg px-4 py-2 text-sm font-medium text-white/50
                      hover:text-white/80 hover:bg-white/5 transition-colors
                      cursor-pointer focus-ring
                    "
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            )}

            {error && (
              /* ---- Error state ---- */
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-400/20">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-red-400"
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1" fill="currentColor" />
                  </svg>
                </div>
                <p className="text-sm text-red-300/80 leading-relaxed">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={requestLocation}
                    className="
                      rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/70
                      hover:bg-white/15 transition-colors cursor-pointer
                    "
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="
                      rounded-lg px-4 py-2 text-sm font-medium text-white/40
                      hover:text-white/60 transition-colors cursor-pointer
                    "
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {hasLocation && !error && (isDetecting || !hasDetected) && (
              /* ---- Detecting state ---- */
              <div className="flex items-center justify-center gap-3 py-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                <span className="text-sm text-white/60">Detecting your bioregion...</span>
              </div>
            )}

            {hasLocation && !error && hasDetected && !isDetecting && (
              /* ---- Detected state ---- */
              <div className="flex flex-col items-center text-center gap-3">
                {/* Bioregion badge */}
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1"
                  style={{
                    backgroundColor: `${REALM_COLORS[bioregion.realm]}15`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: REALM_COLORS[bioregion.realm] }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: REALM_COLORS[bioregion.realm] }}
                  >
                    {bioregion.realm}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white">
                    You&apos;re in the{' '}
                    <span className="text-cyan-400">{bioregion.name}</span>{' '}
                    bioregion
                  </h3>
                  <p className="mt-0.5 text-xs text-white/40 font-mono">
                    {bioregion.code}
                    {distance !== null && ` \u00B7 ~${distance.toLocaleString()} km from centroid`}
                  </p>
                </div>

                {nodesInBioregion.length > 0 ? (
                  <p className="text-sm text-emerald-400/80">
                    There {nodesInBioregion.length === 1 ? 'is' : 'are'}{' '}
                    <span className="font-semibold text-emerald-400">
                      {nodesInBioregion.length}
                    </span>{' '}
                    knowledge commons here!
                  </p>
                ) : (
                  <p className="text-sm text-amber-400/70">
                    There&apos;s no knowledge commons in your bioregion yet.{' '}
                    <span className="text-amber-300">Want to start one?</span>
                  </p>
                )}

                <div className="flex gap-3 mt-1">
                  <button
                    onClick={handleZoom}
                    aria-label="Zoom to your bioregion on the globe"
                    className="
                      rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-gray-950
                      hover:bg-cyan-400 transition-colors cursor-pointer focus-ring
                    "
                  >
                    Zoom to My Bioregion
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="
                      rounded-lg px-4 py-2 text-sm font-medium text-white/40
                      hover:text-white/60 hover:bg-white/5 transition-colors cursor-pointer
                    "
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
