'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { getCameraPositionForLatLng } from '@/lib/geo-utils';
import { assetPath } from '@/lib/constants';
import type { BioregionLookup } from '@/types';

interface GlobeAnimationResult {
  /** Ref to attach to OrbitControls (or any object whose .object.position you want to animate) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.MutableRefObject<any>;
  /** Animate the camera to look at a specific lat/lng */
  animateToLocation: (lat: number, lng: number, zoom?: number) => void;
  /** Animate the camera to look at a bioregion by its code */
  animateToBioregion: (code: string) => void;
}

const ANIMATION_DURATION = 1500; // ms

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function useGlobeAnimation(): GlobeAnimationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [bioregionLookup, setBioregionLookup] = useState<BioregionLookup>({});

  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((res) => res.json())
      .then((data: BioregionLookup) => setBioregionLookup(data))
      .catch(() => {});
  }, []);

  const animateToLocation = useCallback(
    (lat: number, lng: number, zoom: number = 2.5) => {
      const controls = controlsRef.current;
      if (!controls || !controls.object) return;

      // Cancel any existing animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      const camera = controls.object;
      const targetPosition = getCameraPositionForLatLng(lat, lng, zoom);

      const startPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / ANIMATION_DURATION, 1);
        const progress = easeInOutCubic(rawProgress);

        camera.position.x =
          startPosition.x + (targetPosition.x - startPosition.x) * progress;
        camera.position.y =
          startPosition.y + (targetPosition.y - startPosition.y) * progress;
        camera.position.z =
          startPosition.z + (targetPosition.z - startPosition.z) * progress;

        camera.lookAt(0, 0, 0);

        // Update OrbitControls if needed
        if (controls.update) {
          controls.update();
        }

        if (rawProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    []
  );

  const animateToBioregion = useCallback(
    (code: string) => {
      const bioregion = bioregionLookup[code];
      if (!bioregion) return;

      const [lng, lat] = bioregion.centroid;
      animateToLocation(lat, lng);
    },
    [animateToLocation, bioregionLookup]
  );

  return { controlsRef, animateToLocation, animateToBioregion };
}
