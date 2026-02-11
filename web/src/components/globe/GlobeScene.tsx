'use client';

import { Suspense, useRef, useCallback } from 'react';
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
import NodeMarkers from './NodeMarkers';
import FlowArcs from './FlowArcs';
import BridgeConnections from './BridgeConnections';
import TerritoryDrawer from './TerritoryDrawer';
import CameraAnimator from './CameraAnimator';
import HighResTileLayer from './HighResTileLayer';

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

export default function GlobeScene() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const showPlaceNames = useGlobeStore((s) => s.showPlaceNames);
  const showSatelliteImagery = useGlobeStore((s) => s.showSatelliteImagery);
  const showWaterFeatures = useGlobeStore((s) => s.showWaterFeatures);
  const selectedBioregion = useGlobeStore((s) => s.selectedBioregion);
  const selectedEcoregion = useGlobeStore((s) => s.selectedEcoregion);

  // When a bioregion or ecoregion is selected, lock the camera (no auto-rotate).
  const isFocused = !!(selectedBioregion || selectedEcoregion !== null);

  // Pause auto-rotation on interaction, resume after timeout (only when not focused)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInteractionStart = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    // Don't resume auto-rotate when focused on a bioregion/ecoregion
    if (isFocused) return;
    resumeTimer.current = setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true;
      }
    }, 3000);
  }, [isFocused]);

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

          {/* Globe sphere + atmosphere */}
          <GlobeCore showSatellite={showSatelliteImagery} />

          {/* High-resolution tiles (loaded at close zoom) */}
          <HighResTileLayer />

          {/* Water features (rivers, watersheds) */}
          {showWaterFeatures && <WaterFeaturesLayer />}

          {/* Political boundaries (countries + states) — tied to place names toggle */}
          {showPlaceNames && <PoliticalBoundaries />}

          {/* City labels */}
          {showPlaceNames && <CityLabels />}

          {/* Bioregion translucent patches */}
          <BioregionLayer />

          {/* Ecoregion sub-regions (shown when bioregion selected + toggle on) */}
          <EcoregionLayer />

          {/* Node markers with hover labels */}
          <NodeMarkers />

          {/* Animated flow arcs */}
          <FlowArcs />

          {/* Dashed bridge connections */}
          <BridgeConnections />

          {/* Territory boundary drawing (onboarding) */}
          <TerritoryDrawer />

          {/* Camera animation controller */}
          <CameraAnimator />
        </Suspense>

        {/* Orbit controls — auto-rotation disabled when focused on a bioregion/ecoregion */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          minDistance={1.005}
          maxDistance={5}
          autoRotate={!isFocused}
          autoRotateSpeed={0.3}
          onStart={handleInteractionStart}
          onEnd={handleInteractionEnd}
        />
      </Canvas>
    </div>
  );
}
