'use client';

import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useGlobeStore } from '@/stores/globeStore';
import { assetPath } from '@/lib/constants';

// ─── Configuration ─────────────────────────────────────────────────────
// Note: Watershed boundaries are now handled by WatershedLayer.tsx

const WATER_CONFIG = {
  // Only show water features when zoomed in enough
  enableThreshold: 2.5,
  // River line settings
  riverColor: new THREE.Color('#3b82f6'),
  riverOpacity: 0.85,
  riverLineWidth: 3,
  // Lake settings
  lakeColor: new THREE.Color('#2563eb'),
  lakeOpacity: 0.75,
  lakeLineWidth: 2,
};

// ─── Natural Earth River Data Types ────────────────────────────────────

interface RiverFeature {
  type: 'Feature';
  properties: {
    name: string;
    strokeWeig?: number;
    scalerank?: number;
  };
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
}

interface RiverCollection {
  type: 'FeatureCollection';
  features: RiverFeature[];
}

// ─── Geometry Utilities ────────────────────────────────────────────────

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  return new THREE.Vector3(
    radius * Math.cos(latRad) * Math.cos(lngRad),
    radius * Math.sin(latRad),
    -radius * Math.cos(latRad) * Math.sin(lngRad)
  );
}

// Create points array from coordinate array
function createLinePoints(coords: number[][], radius: number): [number, number, number][] {
  const points: [number, number, number][] = [];

  for (const [lng, lat] of coords) {
    const vec = latLngToVector3(lat, lng, radius);
    points.push([vec.x, vec.y, vec.z]);
  }

  return points;
}

// ─── River Lines Component ─────────────────────────────────────────────

function RiverLines({ rivers, zoomDistance }: { rivers: RiverCollection | null; zoomDistance: number }) {
  // Create point arrays for all rivers
  const riverLines = useMemo(() => {
    if (!rivers?.features) return [];

    const radius = 1.003; // Slightly above globe surface
    const lines: [number, number, number][][] = [];

    for (const feature of rivers.features) {
      const { geometry } = feature;

      if (geometry.type === 'LineString') {
        const points = createLinePoints(geometry.coordinates as number[][], radius);
        if (points.length >= 2) lines.push(points);
      } else if (geometry.type === 'MultiLineString') {
        for (const line of geometry.coordinates as number[][][]) {
          const points = createLinePoints(line, radius);
          if (points.length >= 2) lines.push(points);
        }
      }
    }

    return lines;
  }, [rivers]);

  // Calculate opacity based on zoom - fade in earlier for smoother experience
  const opacity = useMemo(() => {
    if (zoomDistance > 2.5) return 0;
    if (zoomDistance < 1.8) return WATER_CONFIG.riverOpacity;
    return WATER_CONFIG.riverOpacity * (2.5 - zoomDistance) / 0.7;
  }, [zoomDistance]);

  if (opacity <= 0 || riverLines.length === 0) {
    return null;
  }

  return (
    <group>
      {riverLines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={WATER_CONFIG.riverColor}
          lineWidth={WATER_CONFIG.riverLineWidth}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  );
}

// ─── Major Lakes Component ─────────────────────────────────────────────

function MajorLakes({ lakes, zoomDistance }: { lakes: RiverCollection | null; zoomDistance: number }) {
  const lakeLines = useMemo(() => {
    if (!lakes?.features) return [];

    const radius = 1.002;
    const lines: [number, number, number][][] = [];

    for (const feature of lakes.features) {
      const { geometry } = feature;

      if (geometry.type === 'LineString') {
        const points = createLinePoints(geometry.coordinates as number[][], radius);
        if (points.length >= 2) lines.push(points);
      } else if (geometry.type === 'MultiLineString') {
        for (const line of geometry.coordinates as number[][][]) {
          const points = createLinePoints(line, radius);
          if (points.length >= 2) lines.push(points);
        }
      }
    }

    return lines;
  }, [lakes]);

  const opacity = useMemo(() => {
    if (zoomDistance > 2.5) return 0;
    if (zoomDistance < 1.8) return WATER_CONFIG.lakeOpacity;
    return WATER_CONFIG.lakeOpacity * (2.5 - zoomDistance) / 0.7;
  }, [zoomDistance]);

  if (opacity <= 0 || lakeLines.length === 0) {
    return null;
  }

  return (
    <group>
      {lakeLines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={WATER_CONFIG.lakeColor}
          lineWidth={WATER_CONFIG.lakeLineWidth}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  );
}

// ─── Main Water Features Layer ─────────────────────────────────────────

export default function WaterFeaturesLayer() {
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);
  const [rivers, setRivers] = useState<RiverCollection | null>(null);
  const [lakes, setLakes] = useState<RiverCollection | null>(null);
  const [loading, setLoading] = useState(false);

  // Load Natural Earth river and lake data
  useEffect(() => {
    if (zoomDistance > WATER_CONFIG.enableThreshold) return;
    if (rivers || loading) return;

    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect

    // Load rivers from Natural Earth (110m scale - major rivers only)
    // These files need to be added to public/data/
    Promise.all([
      fetch(assetPath('/data/ne_110m_rivers_lake_centerlines.json'))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(assetPath('/data/ne_110m_lakes.json'))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([riverData, lakeData]) => {
      if (riverData) setRivers(riverData as RiverCollection);
      if (lakeData) setLakes(lakeData as RiverCollection);
      setLoading(false);
    });
  }, [zoomDistance, rivers, loading]);

  // Don't render if zoomed out too far
  if (zoomDistance > WATER_CONFIG.enableThreshold) {
    return null;
  }

  return (
    <group>
      {/* Major rivers */}
      <RiverLines rivers={rivers} zoomDistance={zoomDistance} />

      {/* Major lakes */}
      <MajorLakes lakes={lakes} zoomDistance={zoomDistance} />
    </group>
  );
}
