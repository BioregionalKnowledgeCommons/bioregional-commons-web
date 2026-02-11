'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useGlobeStore } from '@/stores/globeStore';
import { assetPath } from '@/lib/constants';

// ─── Configuration ─────────────────────────────────────────────────────

const WATER_CONFIG = {
  // Only show water features when zoomed in enough
  enableThreshold: 2.0,
  // River line settings
  riverColor: new THREE.Color('#2563eb'),
  riverOpacity: 0.7,
  riverWidthScale: 0.001,
  // Lake settings
  lakeColor: new THREE.Color('#1d4ed8'),
  lakeOpacity: 0.4,
  // Watershed boundary settings
  watershedColor: new THREE.Color('#06b6d4'),
  watershedOpacity: 0.15,
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
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
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

  // Calculate opacity based on zoom
  const opacity = useMemo(() => {
    if (zoomDistance > 2.0) return 0;
    if (zoomDistance < 1.2) return WATER_CONFIG.riverOpacity;
    return WATER_CONFIG.riverOpacity * (2.0 - zoomDistance) / 0.8;
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
          lineWidth={1}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  );
}

// ─── Major Lakes Component ─────────────────────────────────────────────

function MajorLakes({ lakes, zoomDistance }: { lakes: RiverCollection | null; zoomDistance: number }) {
  // Simplified lake rendering - just outlines for now
  // Full lake fill would require triangulation

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
    if (zoomDistance < 1.5) return WATER_CONFIG.lakeOpacity;
    return WATER_CONFIG.lakeOpacity * (2.5 - zoomDistance);
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
          lineWidth={1}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  );
}

// ─── Watershed Boundaries (fetched from HydroSHEDS API) ────────────────

interface WatershedData {
  geometry: number[][];
  name: string;
  area_km2: number;
}

function WatershedBoundaries({ zoomDistance }: { zoomDistance: number }) {
  const { camera } = useThree();
  const [watersheds, setWatersheds] = useState<WatershedData[]>([]);
  const lastFetch = useRef<string>('');

  // Fetch watershed data when zoomed in close enough
  useFrame(() => {
    if (zoomDistance > 1.4) {
      if (watersheds.length > 0) {
        setWatersheds([]);
        lastFetch.current = '';
      }
      return;
    }

    // Get camera look direction to find center point
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.negate().normalize();

    const lat = Math.asin(direction.y) * (180 / Math.PI);
    const lng = Math.atan2(direction.z, -direction.x) * (180 / Math.PI) - 180;

    // Round to avoid excessive fetches
    const roundedLat = Math.round(lat);
    const roundedLng = Math.round(lng);
    const fetchKey = `${roundedLat},${roundedLng}`;

    if (fetchKey === lastFetch.current) return;
    lastFetch.current = fetchKey;

    // Query HydroSHEDS or mghydro.com watershed API
    // For now, we'll use a placeholder - this would connect to a real watershed API
    // The mghydro.com/watersheds API can be used but requires server-side proxying
    // For the demo, we'll skip the actual API call
  });

  const opacity = useMemo(() => {
    if (zoomDistance > 1.4) return 0;
    if (zoomDistance < 1.1) return WATER_CONFIG.watershedOpacity;
    return WATER_CONFIG.watershedOpacity * (1.4 - zoomDistance) / 0.3;
  }, [zoomDistance]);

  // Convert watershed data to line points
  const watershedLines = useMemo(() => {
    return watersheds.map((ws) => createLinePoints(ws.geometry, 1.004));
  }, [watersheds]);

  if (opacity <= 0 || watershedLines.length === 0) {
    return null;
  }

  // Render watershed boundaries
  return (
    <group>
      {watershedLines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={WATER_CONFIG.watershedColor}
          lineWidth={2}
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

    setLoading(true);

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

      {/* Watershed boundaries (dynamic fetch) */}
      <WatershedBoundaries zoomDistance={zoomDistance} />
    </group>
  );
}
