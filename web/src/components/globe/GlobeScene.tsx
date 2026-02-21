'use client';

import React, { Suspense, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGlobeStore } from '@/stores/globeStore';
import GlobeCore from './GlobeCore';
import PoliticalBoundaries from './PoliticalBoundaries';
import CityLabels from './CityLabels';
import BioregionLayer from './BioregionLayer';
import EcoregionLayer from './EcoregionLayer';
import WaterFeaturesLayer from './WaterFeaturesLayer';
import WatershedLayer from './WatershedLayer';
import NodeMarkers from './NodeMarkers';
import FlowArcs from './FlowArcs';
import BridgeConnections from './BridgeConnections';
import TerritoryDrawer from './TerritoryDrawer';
import CameraAnimator from './CameraAnimator';
import NativeLandsLayer from './NativeLandsLayer';
import HighResTileLayer from './HighResTileLayer';
// // import TestTileLayer from './TestTileLayer';
import LiveNodeMarkers from './LiveNodeMarkers';
import FederationArcs from './FederationArcs';

// Component that tracks camera distance and updates store
function ZoomTracker() {
  const { camera } = useThree();
  const setZoomDistance = useGlobeStore((s) => s.setZoomDistance);
  const lastDistance = useRef(2.8);

  useFrame(() => {
    const distance = camera.position.length();
    // Only update if changed significantly (avoid excessive store updates)
    if (Math.abs(distance - lastDistance.current) > 0.01) {
      lastDistance.current = distance;
      setZoomDistance(distance);
    }
  });

  return null;
}

// Component that dynamically adjusts rotate speed based on zoom level
// Also disables auto-rotate when zoomed in
function DynamicRotateSpeed({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);
  const selectedBioregion = useGlobeStore((s) => s.selectedBioregion);
  const selectedEcoregion = useGlobeStore((s) => s.selectedEcoregion);

  useFrame(() => {
    if (!controlsRef.current) return;

    // At max zoom out (5): rotateSpeed = 0.5 (normal)
    // At close zoom (1.15): rotateSpeed = 0.1 (much slower for precision)
    const t = Math.max(0, Math.min(1, (zoomDistance - 1.15) / (3.5 - 1.15)));
    const rotateSpeed = 0.08 + t * 0.42; // Range: 0.08 to 0.5
    controlsRef.current.rotateSpeed = rotateSpeed;

    // Disable auto-rotate if zoomed in (distance < 2.5) or if a region is selected
    const isZoomedIn = zoomDistance < 2.5;
    const isFocused = !!(selectedBioregion || selectedEcoregion !== null);
    if (isZoomedIn || isFocused) {
      controlsRef.current.autoRotate = false;
    }
  });

  return null;
}

export default function GlobeScene() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const showPlaceNames = useGlobeStore((s) => s.showPlaceNames);
  const showSatelliteImagery = useGlobeStore((s) => s.showSatelliteImagery);
  const showWaterFeatures = useGlobeStore((s) => s.showWaterFeatures);
  const selectedBioregion = useGlobeStore((s) => s.selectedBioregion);
  const selectedEcoregion = useGlobeStore((s) => s.selectedEcoregion);

  const zoomDistance = useGlobeStore((s) => s.zoomDistance);

  // When a bioregion or ecoregion is selected, lock the camera (no auto-rotate).
  const isFocused = !!(selectedBioregion || selectedEcoregion !== null);
  // Only allow auto-rotate when zoomed out to global view
  const isGlobalView = zoomDistance > 2.5;

  // Pause auto-rotation on interaction, resume after long timeout (only at global view)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInteractionStart = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    // Don't resume auto-rotate when focused on a bioregion/ecoregion or zoomed in
    if (isFocused || !isGlobalView) return;

    // 5 minutes of inactivity at global view before auto-rotate resumes
    resumeTimer.current = setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true;
      }
    }, 300000); // 5 minutes = 300000ms
  }, [isFocused, isGlobalView]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0a' }}>
      <Canvas
        camera={{
          position: [0, 0, 2.8],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Starfield background */}
        <Stars
          radius={50}
          depth={60}
          count={2500}
          factor={3}
          saturation={0}
          fade
          speed={0.5}
        />

        <Suspense fallback={null}>
          {/* Zoom level tracker */}
          <ZoomTracker />

          {/* Dynamic rotate speed based on zoom */}
          <DynamicRotateSpeed controlsRef={controlsRef} />

          {/* Globe sphere + atmosphere */}
          <GlobeCore showSatellite={showSatelliteImagery} />

          {/* High-resolution tiles (loaded at close zoom) */}
          <HighResTileLayer />
          {/* <TestTileLayer /> */}

          {/* Watershed basins (from HydroBASINS/GRDC data) */}
          {showWaterFeatures && <WatershedLayer />}

          {/* Rivers and lakes (from Natural Earth) */}
          {showWaterFeatures && <WaterFeaturesLayer />}

          {/* Political boundaries (countries + states) — tied to place names toggle */}
          {showPlaceNames && <PoliticalBoundaries />}

          {/* City labels */}
          {showPlaceNames && <CityLabels />}

          {/* Native Lands Digital territories, languages, treaties */}
          <NativeLandsLayer />

          {/* Bioregion translucent patches */}
          <BioregionLayer />

          {/* Ecoregion sub-regions (shown when bioregion selected + toggle on) */}
          <EcoregionLayer />

          {/* Seed node markers with hover labels */}
          <NodeMarkers />

          {/* Live KOI node markers (diamond shape, health-colored) */}
          <LiveNodeMarkers />

          {/* Animated seed flow arcs */}
          <FlowArcs />

          {/* Live federation arcs between KOI nodes */}
          <FederationArcs />

          {/* Dashed bridge connections */}
          <BridgeConnections />

          {/* Territory boundary drawing (onboarding) */}
          <TerritoryDrawer />

          {/* Camera animation controller */}
          <CameraAnimator />
        </Suspense>

        {/* Orbit controls — auto-rotation only at global view after long inactivity */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          minDistance={1.15}
          maxDistance={5}
          enableZoom={true}
          autoRotate={false}
          autoRotateSpeed={0.05}
          onStart={handleInteractionStart}
          onEnd={handleInteractionEnd}
        />
      </Canvas>
    </div>
  );
}
