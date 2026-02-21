'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import earcut from 'earcut';
import { latLngToVector3 } from '@/lib/geo-utils';
import { useGlobeStore } from '@/stores/globeStore';
import type { NativeLandGeoJSON, NativeLandFeature, NativeLandType } from '@/types';

// ─── Configuration ─────────────────────────────────────────────────────

const NATIVE_LANDS_CONFIG = {
  // API endpoints (CloudFront CDN)
  territoriesUrl: 'https://d2u5ssx9zi93qh.cloudfront.net/territories.geojson',
  languagesUrl: 'https://d2u5ssx9zi93qh.cloudfront.net/languages.geojson',
  treatiesUrl: 'https://d2u5ssx9zi93qh.cloudfront.net/treaties.geojson',
  // Render settings - altitudes above globe surface (layered to avoid z-fighting)
  territoryAltitude: 1.006,
  languageAltitude: 1.007,
  treatyAltitude: 1.0065,
  // Opacity settings
  fillOpacity: 0.25,
  lineOpacity: 0.6,
  selectedFillOpacity: 0.45,
  selectedLineOpacity: 0.9,
  // Hover/selection
  hoverFillOpacity: 0.35,
};

// ─── Cache for loaded GeoJSON ──────────────────────────────────────────

const dataCache: Record<NativeLandType, NativeLandGeoJSON | null> = {
  territories: null,
  languages: null,
  treaties: null,
};

const loadingState: Record<NativeLandType, boolean> = {
  territories: false,
  languages: false,
  treaties: false,
};

// ─── Geometry Utilities ────────────────────────────────────────────────

function createBoundaryGeometry(ring: number[][], altitude: number): THREE.BufferGeometry {
  const points = ring.map(([lng, lat]) => latLngToVector3(lat, lng, altitude + 0.001));
  return new THREE.BufferGeometry().setFromPoints(points);
}

function createFilledGeometry(rings: number[][][], altitude: number): THREE.BufferGeometry | null {
  const outerRing = rings[0];
  if (!outerRing || outerRing.length < 4) return null;

  // Flatten coordinates for earcut (2D triangulation)
  const flatCoords: number[] = [];
  const holeIndices: number[] = [];

  // Outer ring
  for (const [lng, lat] of outerRing) {
    flatCoords.push(lng, lat);
  }

  // Hole rings (if any)
  for (let i = 1; i < rings.length; i++) {
    holeIndices.push(flatCoords.length / 2);
    for (const [lng, lat] of rings[i]) {
      flatCoords.push(lng, lat);
    }
  }

  // Triangulate
  const indices = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);
  if (indices.length === 0) return null;

  // Convert all 2D coords to 3D sphere positions
  const totalPoints = flatCoords.length / 2;
  const positions = new Float32Array(totalPoints * 3);

  for (let i = 0; i < totalPoints; i++) {
    const lng = flatCoords[i * 2];
    const lat = flatCoords[i * 2 + 1];
    const pos = latLngToVector3(lat, lng, altitude);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(Array.from(indices));
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Process a feature into renderable data ────────────────────────────

interface ProcessedNativeLand {
  feature: NativeLandFeature;
  color: THREE.Color;
  boundaryGeometries: THREE.BufferGeometry[];
  fillGeometries: THREE.BufferGeometry[];
}

function processFeature(feature: NativeLandFeature, altitude: number): ProcessedNativeLand {
  const colorHex = feature.properties.color || '#0e1b82';
  const color = new THREE.Color(colorHex);

  const boundaryGeometries: THREE.BufferGeometry[] = [];
  const fillGeometries: THREE.BufferGeometry[] = [];

  // MultiPolygon: array of polygons, each polygon is array of rings
  const polygons = feature.geometry.coordinates;
  for (const polygon of polygons) {
    if (!polygon[0] || polygon[0].length < 4) continue;

    // Outer ring for boundary
    boundaryGeometries.push(createBoundaryGeometry(polygon[0], altitude));

    // Fill geometry (handles holes if present)
    const fill = createFilledGeometry(polygon, altitude);
    if (fill) fillGeometries.push(fill);
  }

  return {
    feature,
    color,
    boundaryGeometries,
    fillGeometries,
  };
}

// ─── Fetch data with caching ───────────────────────────────────────────

async function fetchNativeLandData(type: NativeLandType): Promise<NativeLandGeoJSON | null> {
  if (dataCache[type]) return dataCache[type];
  if (loadingState[type]) return null;

  loadingState[type] = true;

  const urls: Record<NativeLandType, string> = {
    territories: NATIVE_LANDS_CONFIG.territoriesUrl,
    languages: NATIVE_LANDS_CONFIG.languagesUrl,
    treaties: NATIVE_LANDS_CONFIG.treatiesUrl,
  };

  try {
    const response = await fetch(urls[type]);
    if (!response.ok) throw new Error(`Failed to fetch ${type}`);
    const data: NativeLandGeoJSON = await response.json();
    dataCache[type] = data;
    loadingState[type] = false;
    return data;
  } catch (error) {
    console.error(`Failed to load Native Lands ${type}:`, error);
    loadingState[type] = false;
    return null;
  }
}

// ─── Individual Native Land Mesh ───────────────────────────────────────

interface NativeLandMeshProps {
  processed: ProcessedNativeLand;
  type: NativeLandType;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (feature: NativeLandFeature | null) => void;
  onClick: (feature: NativeLandFeature) => void;
}

function NativeLandMesh({ processed, isSelected, isHovered, onHover, onClick }: NativeLandMeshProps) {
  const fillGroupRef = useRef<THREE.Group>(null);
  const lineGroupRef = useRef<THREE.Group>(null);

  // Animate opacity based on selection/hover state
  useFrame(() => {
    if (!fillGroupRef.current) return;

    let targetFillOpacity: number;
    if (isSelected) {
      targetFillOpacity = NATIVE_LANDS_CONFIG.selectedFillOpacity;
    } else if (isHovered) {
      targetFillOpacity = NATIVE_LANDS_CONFIG.hoverFillOpacity;
    } else {
      targetFillOpacity = NATIVE_LANDS_CONFIG.fillOpacity;
    }

    fillGroupRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetFillOpacity - mat.opacity) * 0.12;
    });

    if (!lineGroupRef.current) return;

    const targetLineOpacity = isSelected
      ? NATIVE_LANDS_CONFIG.selectedLineOpacity
      : isHovered
        ? 0.8
        : NATIVE_LANDS_CONFIG.lineOpacity;

    lineGroupRef.current.children.forEach((child) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity += (targetLineOpacity - mat.opacity) * 0.12;
    });
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(processed.feature);
      document.body.style.cursor = 'pointer';
    },
    [processed.feature, onHover]
  );

  const handlePointerOut = useCallback(() => {
    onHover(null);
    document.body.style.cursor = 'default';
  }, [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(processed.feature);
    },
    [processed.feature, onClick]
  );

  // Brighter line color
  const lineColor = useMemo(() => {
    const c = processed.color.clone();
    c.multiplyScalar(isSelected ? 1.5 : 1.2);
    return c;
  }, [processed.color, isSelected]);

  return (
    <group>
      {/* Filled polygons */}
      <group ref={fillGroupRef}>
        {processed.fillGeometries.map((geom, i) => (
          <mesh
            key={`fill-${i}`}
            geometry={geom}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <meshBasicMaterial
              color={processed.color}
              transparent
              opacity={NATIVE_LANDS_CONFIG.fillOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Boundary lines */}
      <group ref={lineGroupRef}>
        {processed.boundaryGeometries.map((geom, i) => (
          <lineLoop key={`line-${i}`} geometry={geom}>
            <lineBasicMaterial
              color={lineColor}
              transparent
              opacity={NATIVE_LANDS_CONFIG.lineOpacity}
              linewidth={1}
            />
          </lineLoop>
        ))}
      </group>
    </group>
  );
}

// ─── Layer Component for a specific type ───────────────────────────────

interface NativeLandTypeLayerProps {
  type: NativeLandType;
  altitude: number;
}

function NativeLandTypeLayer({ type, altitude }: NativeLandTypeLayerProps) {
  const [data, setData] = useState<NativeLandGeoJSON | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<NativeLandFeature | null>(null);
  const selectedNativeLand = useGlobeStore((s) => s.selectedNativeLand);
  const setSelectedNativeLand = useGlobeStore((s) => s.setSelectedNativeLand);
  const flyTo = useGlobeStore((s) => s.flyTo);

  // Load data on mount
  useEffect(() => {
    fetchNativeLandData(type).then(setData);
  }, [type]);

  // Process features into renderable data
  const processedFeatures = useMemo(() => {
    if (!data?.features) return [];
    return data.features.map((f) => processFeature(f, altitude));
  }, [data, altitude]);

  // Handle click - select and fly to centroid
  const handleClick = useCallback(
    (feature: NativeLandFeature) => {
      setSelectedNativeLand({ type, feature });

      // Calculate centroid from first polygon's outer ring
      const coords = feature.geometry.coordinates[0]?.[0];
      if (coords && coords.length > 0) {
        let totalLng = 0;
        let totalLat = 0;
        for (const [lng, lat] of coords) {
          totalLng += lng;
          totalLat += lat;
        }
        const centroidLng = totalLng / coords.length;
        const centroidLat = totalLat / coords.length;
        flyTo(centroidLat, centroidLng, 2.0);
      }
    },
    [type, setSelectedNativeLand, flyTo]
  );

  const handleHover = useCallback((feature: NativeLandFeature | null) => {
    setHoveredFeature(feature);
  }, []);

  if (processedFeatures.length === 0) return null;

  return (
    <group>
      {processedFeatures.map((processed) => (
        <NativeLandMesh
          key={processed.feature.id}
          processed={processed}
          type={type}
          isSelected={
            selectedNativeLand?.type === type &&
            selectedNativeLand?.feature.id === processed.feature.id
          }
          isHovered={hoveredFeature?.id === processed.feature.id}
          onHover={handleHover}
          onClick={handleClick}
        />
      ))}
    </group>
  );
}

// ─── Main NativeLandsLayer Component ───────────────────────────────────

export default function NativeLandsLayer() {
  const showNativeTerritories = useGlobeStore((s) => s.showNativeTerritories);
  const showNativeLanguages = useGlobeStore((s) => s.showNativeLanguages);
  const showNativeTreaties = useGlobeStore((s) => s.showNativeTreaties);

  return (
    <group>
      {showNativeTerritories && (
        <NativeLandTypeLayer
          type="territories"
          altitude={NATIVE_LANDS_CONFIG.territoryAltitude}
        />
      )}
      {showNativeLanguages && (
        <NativeLandTypeLayer
          type="languages"
          altitude={NATIVE_LANDS_CONFIG.languageAltitude}
        />
      )}
      {showNativeTreaties && (
        <NativeLandTypeLayer
          type="treaties"
          altitude={NATIVE_LANDS_CONFIG.treatyAltitude}
        />
      )}
    </group>
  );
}
