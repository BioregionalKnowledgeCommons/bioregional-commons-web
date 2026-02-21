'use client';

import { useState, useEffect } from 'react';
import type { BioregionInfo, BioregionLookup } from '@/types';
import { haversineDistance } from '@/lib/geo-utils';
import { assetPath } from '@/lib/constants';
import { useGlobeStore } from '@/stores/globeStore';

interface BioregionDetectionResult {
  bioregion: BioregionInfo | null;
  distance: number | null;
  isDetecting: boolean;
}

/**
 * Detects the nearest bioregion to a given lat/lng using centroid distances.
 * Loads the full 185-bioregion lookup for accurate detection.
 * Updates the globe store with the detected bioregion code.
 */
export function useBioregionDetection(
  lat: number | null,
  lng: number | null
): BioregionDetectionResult {
  const [bioregion, setBioregion] = useState<BioregionInfo | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [fullLookup, setFullLookup] = useState<BioregionLookup | null>(null);
  const setUserBioregion = useGlobeStore((s) => s.setUserBioregion);

  // Load full bioregion lookup on mount
  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((res) => res.json())
      .then((data: BioregionLookup) => setFullLookup(data))
      .catch((err) => console.error('Failed to load bioregion lookup:', err));
  }, []);

  useEffect(() => {
    if (lat === null || lng === null || !fullLookup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBioregion(null);
      setDistance(null);
      return;
    }

    setIsDetecting(true);

    // Use a microtask to keep the UI responsive
    const timeoutId = setTimeout(() => {
      let nearestBioregion: BioregionInfo | null = null;
      let minDistance = Infinity;

      const entries = Object.values(fullLookup);
      for (const info of entries) {
        const [centroidLng, centroidLat] = info.centroid;
        const d = haversineDistance(lat, lng, centroidLat, centroidLng);

        if (d < minDistance) {
          minDistance = d;
          nearestBioregion = info;
        }
      }

      setBioregion(nearestBioregion);
      setDistance(nearestBioregion ? Math.round(minDistance) : null);
      setIsDetecting(false);

      // Update global store
      if (nearestBioregion) {
        setUserBioregion(nearestBioregion.code);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [lat, lng, fullLookup, setUserBioregion]);

  return { bioregion, distance, isDetecting };
}
