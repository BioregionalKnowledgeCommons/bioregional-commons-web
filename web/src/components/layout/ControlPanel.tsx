'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';

interface ToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}

function Toggle({ label, enabled, onToggle, icon }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2.5 w-full py-1.5 group focus-ring"
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${label}`}
    >
      {/* Toggle track */}
      <div
        className={[
          'relative w-8 h-[18px] rounded-full transition-colors duration-200 flex-shrink-0',
          enabled ? 'bg-emerald-500/70' : 'bg-gray-700/60',
        ].join(' ')}
      >
        <motion.div
          className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm"
          animate={{ left: enabled ? 14 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>

      {/* Icon */}
      <span
        className={`flex-shrink-0 transition-colors duration-200 ${
          enabled ? 'text-gray-300' : 'text-gray-600'
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Label */}
      <span
        className={`text-xs transition-colors duration-200 ${
          enabled
            ? 'text-gray-300'
            : 'text-gray-500 group-hover:text-gray-400'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

type ViewModeOption = 'globe' | 'map' | 'list';

interface ViewModeButtonProps {
  mode: ViewModeOption;
  currentMode: ViewModeOption;
  label: string;
  icon: React.ReactNode;
  onSelect: (mode: ViewModeOption) => void;
  comingSoon?: boolean;
}

function ViewModeButton({
  mode,
  currentMode,
  label,
  icon,
  onSelect,
  comingSoon,
}: ViewModeButtonProps) {
  const isActive = currentMode === mode;
  return (
    <button
      onClick={() => !comingSoon && onSelect(mode)}
      aria-label={`${label} view${comingSoon ? ' (coming soon)' : ''}`}
      aria-pressed={isActive}
      disabled={comingSoon}
      className={[
        'relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 flex-1 focus-ring',
        isActive
          ? 'bg-gray-700/60 text-white'
          : comingSoon
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40',
      ].join(' ')}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
      {comingSoon && (
        <span className="absolute -top-1 -right-1 text-[7px] px-1 py-0.5 rounded bg-gray-700/80 text-gray-400 border border-gray-600/30 leading-none">
          Soon
        </span>
      )}
    </button>
  );
}

export default function ControlPanel() {
  const showFlowArcs = useGlobeStore((s) => s.showFlowArcs);
  const showBridges = useGlobeStore((s) => s.showBridges);
  const showBioregions = useGlobeStore((s) => s.showBioregions);
  const showEcoregions = useGlobeStore((s) => s.showEcoregions);
  const showPlaceNames = useGlobeStore((s) => s.showPlaceNames);
  const showSatelliteImagery = useGlobeStore((s) => s.showSatelliteImagery);
  const showWaterFeatures = useGlobeStore((s) => s.showWaterFeatures);
  const showNativeTerritories = useGlobeStore((s) => s.showNativeTerritories);
  const showNativeLanguages = useGlobeStore((s) => s.showNativeLanguages);
  const showNativeTreaties = useGlobeStore((s) => s.showNativeTreaties);
  const viewMode = useGlobeStore((s) => s.viewMode);
  const toggleFlowArcs = useGlobeStore((s) => s.toggleFlowArcs);
  const toggleBridges = useGlobeStore((s) => s.toggleBridges);
  const toggleBioregions = useGlobeStore((s) => s.toggleBioregions);
  const toggleEcoregions = useGlobeStore((s) => s.toggleEcoregions);
  const togglePlaceNames = useGlobeStore((s) => s.togglePlaceNames);
  const toggleSatelliteImagery = useGlobeStore((s) => s.toggleSatelliteImagery);
  const toggleWaterFeatures = useGlobeStore((s) => s.toggleWaterFeatures);
  const toggleNativeTerritories = useGlobeStore((s) => s.toggleNativeTerritories);
  const toggleNativeLanguages = useGlobeStore((s) => s.toggleNativeLanguages);
  const toggleNativeTreaties = useGlobeStore((s) => s.toggleNativeTreaties);
  const setViewMode = useGlobeStore((s) => s.setViewMode);

  // Mobile: collapsed / expanded state
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Count active layers for the badge
  const activeLayers = [showFlowArcs, showBridges, showBioregions, showEcoregions, showPlaceNames, showSatelliteImagery, showWaterFeatures, showNativeTerritories, showNativeLanguages, showNativeTreaties].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="fixed bottom-6 left-4 z-30"
      role="region"
      aria-label="Map controls"
    >
      {/* ─── Mobile: Compact floating button (< 640px) ─── */}
      <div className="sm:hidden">
        <AnimatePresence>
          {mobileExpanded && (
            <>
              {/* Backdrop to close on tap outside */}
              <motion.div
                key="ctrl-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[-1]"
                onClick={() => setMobileExpanded(false)}
                aria-hidden="true"
              />

              {/* Expanded panel — slides up above the button */}
              <motion.div
                key="ctrl-panel"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute bottom-14 left-0 mb-2 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-700/30 shadow-xl shadow-black/30 p-3 space-y-3 w-[200px]"
              >
                {/* Drag handle */}
                <div className="flex justify-center pb-1">
                  <div className="w-8 h-1 rounded-full bg-gray-600" />
                </div>

                {/* Layer Toggles */}
                <div className="space-y-1">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">
                    Layers
                  </h4>
                  <Toggle
                    label="Flow Arcs"
                    enabled={showFlowArcs}
                    onToggle={toggleFlowArcs}
                    icon={<LayerArcIcon />}
                  />
                  <Toggle
                    label="Bridges"
                    enabled={showBridges}
                    onToggle={toggleBridges}
                    icon={<BridgeIcon />}
                  />
                  <Toggle
                    label="Bioregions"
                    enabled={showBioregions}
                    onToggle={toggleBioregions}
                    icon={<MapIcon />}
                  />
                  <Toggle
                    label="Ecoregions"
                    enabled={showEcoregions}
                    onToggle={toggleEcoregions}
                    icon={<EcoregionIcon />}
                  />
                  <Toggle
                    label="Place Names"
                    enabled={showPlaceNames}
                    onToggle={togglePlaceNames}
                    icon={<PlaceNameIcon />}
                  />
                  <Toggle
                    label="Satellite"
                    enabled={showSatelliteImagery}
                    onToggle={toggleSatelliteImagery}
                    icon={<SatelliteIcon />}
                  />
                  <Toggle
                    label="Water Features"
                    enabled={showWaterFeatures}
                    onToggle={toggleWaterFeatures}
                    icon={<WaterIcon />}
                  />
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-700/30" />

                {/* Native Lands Section */}
                <div className="space-y-1">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">
                    Native Lands
                  </h4>
                  <Toggle
                    label="Territories"
                    enabled={showNativeTerritories}
                    onToggle={toggleNativeTerritories}
                    icon={<TerritoryIcon />}
                  />
                  <Toggle
                    label="Languages"
                    enabled={showNativeLanguages}
                    onToggle={toggleNativeLanguages}
                    icon={<LanguageIcon />}
                  />
                  <Toggle
                    label="Treaties"
                    enabled={showNativeTreaties}
                    onToggle={toggleNativeTreaties}
                    icon={<TreatyIcon />}
                  />
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-700/30" />

                {/* View Mode */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                    View
                  </h4>
                  <div className="flex gap-1">
                    <ViewModeButton mode="globe" currentMode={viewMode} label="Globe" onSelect={setViewMode} icon={<GlobeIcon />} />
                    <ViewModeButton mode="map" currentMode={viewMode} label="Map" onSelect={setViewMode} icon={<MapIcon />} />
                    <ViewModeButton mode="list" currentMode={viewMode} label="List" onSelect={setViewMode} icon={<ListIcon />} />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating toggle button */}
        <button
          onClick={() => setMobileExpanded((prev) => !prev)}
          aria-label={mobileExpanded ? 'Close controls' : 'Open controls'}
          aria-expanded={mobileExpanded}
          className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/40 shadow-lg shadow-black/20 text-gray-300 hover:text-white transition-colors focus-ring"
        >
          {/* Layers icon */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25" />
          </svg>

          {/* Active-count badge */}
          {activeLayers > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-emerald-500 text-gray-950">
              {activeLayers}
            </span>
          )}
        </button>
      </div>

      {/* ─── Desktop: Always-visible panel (>= 640px) ─── */}
      <div className="hidden sm:block">
        <div className="bg-gray-900/85 backdrop-blur-xl rounded-xl border border-gray-700/30 shadow-xl shadow-black/20 p-3 space-y-3 w-[200px]">
          {/* Layer Toggles */}
          <div className="space-y-1">
            <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">
              Layers
            </h4>
            <Toggle
              label="Flow Arcs"
              enabled={showFlowArcs}
              onToggle={toggleFlowArcs}
              icon={<LayerArcIcon />}
            />
            <Toggle
              label="Bridges"
              enabled={showBridges}
              onToggle={toggleBridges}
              icon={<BridgeIcon />}
            />
            <Toggle
              label="Bioregions"
              enabled={showBioregions}
              onToggle={toggleBioregions}
              icon={<MapIcon />}
            />
            <Toggle
              label="Ecoregions"
              enabled={showEcoregions}
              onToggle={toggleEcoregions}
              icon={<EcoregionIcon />}
            />
            <Toggle
              label="Place Names"
              enabled={showPlaceNames}
              onToggle={togglePlaceNames}
              icon={<PlaceNameIcon />}
            />
            <Toggle
              label="Satellite"
              enabled={showSatelliteImagery}
              onToggle={toggleSatelliteImagery}
              icon={<SatelliteIcon />}
            />
            <Toggle
              label="Water Features"
              enabled={showWaterFeatures}
              onToggle={toggleWaterFeatures}
              icon={<WaterIcon />}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-700/30" />

          {/* Native Lands Section */}
          <div className="space-y-1">
            <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">
              Native Lands
            </h4>
            <Toggle
              label="Territories"
              enabled={showNativeTerritories}
              onToggle={toggleNativeTerritories}
              icon={<TerritoryIcon />}
            />
            <Toggle
              label="Languages"
              enabled={showNativeLanguages}
              onToggle={toggleNativeLanguages}
              icon={<LanguageIcon />}
            />
            <Toggle
              label="Treaties"
              enabled={showNativeTreaties}
              onToggle={toggleNativeTreaties}
              icon={<TreatyIcon />}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-700/30" />

          {/* View Mode */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              View
            </h4>
            <div className="flex gap-1">
              <ViewModeButton mode="globe" currentMode={viewMode} label="Globe" onSelect={setViewMode} icon={<GlobeIcon />} />
              <ViewModeButton mode="map" currentMode={viewMode} label="Map" onSelect={setViewMode} icon={<MapIcon />} />
              <ViewModeButton mode="list" currentMode={viewMode} label="List" onSelect={setViewMode} icon={<ListIcon />} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Extracted Icon Components (DRY) ────────────────────────────────── */

function LayerArcIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function BridgeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function EcoregionIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function PlaceNameIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function SatelliteIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
    </svg>
  );
}

function WaterIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.5 2.5-5 6.5-5 10a5 5 0 0010 0c0-3.5-3.5-7.5-5-10z" />
    </svg>
  );
}

function TerritoryIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
    </svg>
  );
}

function TreatyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
