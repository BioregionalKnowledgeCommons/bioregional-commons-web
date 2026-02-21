'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import earcut from 'earcut';
import { Html } from '@react-three/drei';
import { latLngToVector3 } from '@/lib/geo-utils';
import { useGlobeStore } from '@/stores/globeStore';
import { assetPath } from '@/lib/constants';

// ─── Configuration ─────────────────────────────────────────────────────

const WATERSHED_CONFIG = {
  // Level of detail thresholds (camera distance)
  lod: {
    level1: { maxDistance: 5.0, minDistance: 2.5 },  // Continental basins
    level2: { maxDistance: 2.5, minDistance: 1.8 },  // Major basins
    level3: { maxDistance: 1.8, minDistance: 1.4 },  // Regional basins
    level4: { maxDistance: 1.4, minDistance: 0 },    // Local watersheds
  },
  // Styling
  fillColor: new THREE.Color('#0ea5e9'),  // sky-500
  lineColor: new THREE.Color('#06b6d4'),  // cyan-500
  selectedFillColor: new THREE.Color('#0284c7'),  // sky-600
  selectedLineColor: new THREE.Color('#22d3ee'),  // cyan-400
  fillOpacity: 0.15,
  lineOpacity: 0.5,
  selectedFillOpacity: 0.35,
  selectedLineOpacity: 0.9,
  altitude: 1.004,  // Above globe surface, below bioregions
};

// ─── Types ─────────────────────────────────────────────────────────────

interface WatershedFeature {
  type: 'Feature';
  properties: {
    MRBID?: number;
    RIVER_NAME?: string;
    HYBAS_ID?: number;
    NAME?: string;
    name?: string;
    AREA_SQKM?: number;
    SUB_AREA?: number;
    // GRDC/HydroBASINS attributes
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface WatershedGeoJSON {
  type: 'FeatureCollection';
  features: WatershedFeature[];
}

interface ProcessedWatershed {
  id: string;
  name: string;
  area: number;
  color: THREE.Color;
  fillGeometries: THREE.BufferGeometry[];
  boundaryGeometries: THREE.BufferGeometry[];
  centroid: [number, number];
}

// ─── Geometry Utilities ────────────────────────────────────────────────

function createBoundaryGeometry(ring: number[][], altitude: number): THREE.BufferGeometry {
  const points = ring.map(([lng, lat]) => latLngToVector3(lat, lng, altitude + 0.001));
  return new THREE.BufferGeometry().setFromPoints(points);
}

function createFilledGeometry(rings: number[][][], altitude: number): THREE.BufferGeometry | null {
  const outerRing = rings[0];
  if (!outerRing || outerRing.length < 4) return null;

  const flatCoords: number[] = [];
  const holeIndices: number[] = [];

  for (const [lng, lat] of outerRing) {
    flatCoords.push(lng, lat);
  }

  for (let i = 1; i < rings.length; i++) {
    holeIndices.push(flatCoords.length / 2);
    for (const [lng, lat] of rings[i]) {
      flatCoords.push(lng, lat);
    }
  }

  const indices = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);
  if (indices.length === 0) return null;

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

function calculateCentroid(rings: number[][][]): [number, number] {
  const outer = rings[0];
  if (!outer || outer.length === 0) return [0, 0];

  let totalLng = 0;
  let totalLat = 0;
  for (const [lng, lat] of outer) {
    totalLng += lng;
    totalLat += lat;
  }
  return [totalLng / outer.length, totalLat / outer.length];
}

// ─── Feature Processing ────────────────────────────────────────────────

function processFeature(feature: WatershedFeature, index: number): ProcessedWatershed | null {
  const props = feature.properties;
  const id = String(props.MRBID || props.HYBAS_ID || index);
  const name = props.RIVER_NAME || props.NAME || props.name || `Basin ${id}`;
  const area = props.AREA_SQKM || props.SUB_AREA || 0;

  // Color variation based on area (larger = more saturated)
  const hue = 0.55 + (Math.random() * 0.1 - 0.05); // Cyan-ish
  const saturation = 0.5 + Math.min(area / 500000, 0.4);
  const lightness = 0.45 + Math.random() * 0.1;
  const color = new THREE.Color().setHSL(hue, saturation, lightness);

  const fillGeometries: THREE.BufferGeometry[] = [];
  const boundaryGeometries: THREE.BufferGeometry[] = [];
  let centroid: [number, number] = [0, 0];

  try {
    if (feature.geometry.type === 'Polygon') {
      const rings = feature.geometry.coordinates as number[][][];
      if (rings[0] && rings[0].length >= 4) {
        const fill = createFilledGeometry(rings, WATERSHED_CONFIG.altitude);
        if (fill) fillGeometries.push(fill);
        boundaryGeometries.push(createBoundaryGeometry(rings[0], WATERSHED_CONFIG.altitude));
        centroid = calculateCentroid(rings);
      }
    } else if (feature.geometry.type === 'MultiPolygon') {
      const polygons = feature.geometry.coordinates as number[][][][];
      let totalLng = 0, totalLat = 0, pointCount = 0;

      for (const polygon of polygons) {
        if (polygon[0] && polygon[0].length >= 4) {
          const fill = createFilledGeometry(polygon, WATERSHED_CONFIG.altitude);
          if (fill) fillGeometries.push(fill);
          boundaryGeometries.push(createBoundaryGeometry(polygon[0], WATERSHED_CONFIG.altitude));

          for (const [lng, lat] of polygon[0]) {
            totalLng += lng;
            totalLat += lat;
            pointCount++;
          }
        }
      }

      if (pointCount > 0) {
        centroid = [totalLng / pointCount, totalLat / pointCount];
      }
    }
  } catch (e) {
    console.warn(`Failed to process watershed ${id}:`, e);
    return null;
  }

  if (fillGeometries.length === 0 && boundaryGeometries.length === 0) {
    return null;
  }

  return { id, name, area, color, fillGeometries, boundaryGeometries, centroid };
}

// ─── Data Cache ────────────────────────────────────────────────────────

const dataCache: Record<string, WatershedGeoJSON | null> = {};
const loadingState: Record<string, boolean> = {};

async function loadWatershedData(level: number): Promise<WatershedGeoJSON | null> {
  const key = `level${level}`;
  if (dataCache[key] !== undefined) return dataCache[key];
  if (loadingState[key]) return null;

  loadingState[key] = true;

  // Try to load level-specific file, fall back to combined file
  const paths = [
    assetPath(`/data/watersheds/basins-level${level}.json`),
    assetPath(`/data/watersheds/major-basins.json`),
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const data = await response.json();
        dataCache[key] = data;
        loadingState[key] = false;
        return data;
      }
    } catch {
      // Continue to next path
    }
  }

  dataCache[key] = null;
  loadingState[key] = false;
  return null;
}

// ─── Individual Watershed Mesh ─────────────────────────────────────────

interface WatershedMeshProps {
  watershed: ProcessedWatershed;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (watershed: ProcessedWatershed) => void;
}

function WatershedMesh({ watershed, isSelected, isHovered, onHover, onClick }: WatershedMeshProps) {
  const fillGroupRef = useRef<THREE.Group>(null);
  const lineGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!fillGroupRef.current) return;

    let targetFillOpacity: number;
    if (isSelected) {
      targetFillOpacity = WATERSHED_CONFIG.selectedFillOpacity;
    } else if (isHovered) {
      targetFillOpacity = 0.25;
    } else {
      targetFillOpacity = WATERSHED_CONFIG.fillOpacity;
    }

    fillGroupRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetFillOpacity - mat.opacity) * 0.12;
    });

    if (!lineGroupRef.current) return;

    const targetLineOpacity = isSelected
      ? WATERSHED_CONFIG.selectedLineOpacity
      : isHovered
        ? 0.7
        : WATERSHED_CONFIG.lineOpacity;

    lineGroupRef.current.children.forEach((child) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity += (targetLineOpacity - mat.opacity) * 0.12;
    });
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(watershed.id);
      document.body.style.cursor = 'pointer';
    },
    [watershed.id, onHover]
  );

  const handlePointerOut = useCallback(() => {
    onHover(null);
    document.body.style.cursor = 'default';
  }, [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(watershed);
    },
    [watershed, onClick]
  );

  const lineColor = useMemo(() => {
    return isSelected
      ? WATERSHED_CONFIG.selectedLineColor
      : watershed.color.clone().multiplyScalar(1.3);
  }, [watershed.color, isSelected]);

  return (
    <group>
      <group ref={fillGroupRef}>
        {watershed.fillGeometries.map((geom, i) => (
          <mesh
            key={`fill-${i}`}
            geometry={geom}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <meshBasicMaterial
              color={isSelected ? WATERSHED_CONFIG.selectedFillColor : watershed.color}
              transparent
              opacity={WATERSHED_CONFIG.fillOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <group ref={lineGroupRef}>
        {watershed.boundaryGeometries.map((geom, i) => (
          <lineLoop key={`line-${i}`} geometry={geom}>
            <lineBasicMaterial
              color={lineColor}
              transparent
              opacity={WATERSHED_CONFIG.lineOpacity}
              linewidth={1}
            />
          </lineLoop>
        ))}
      </group>
    </group>
  );
}

// ─── Watershed Label ───────────────────────────────────────────────────

interface WatershedLabelProps {
  watershed: ProcessedWatershed;
  isVisible: boolean;
}

function WatershedLabel({ watershed, isVisible }: WatershedLabelProps) {
  const position = useMemo(() => {
    const [lng, lat] = watershed.centroid;
    return latLngToVector3(lat, lng, WATERSHED_CONFIG.altitude + 0.01);
  }, [watershed.centroid]);

  if (!isVisible) return null;

  return (
    <Html
      position={position}
      style={{
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        transform: 'translate(-50%, -50%)',
      }}
      zIndexRange={[50, 0]}
    >
      <div
        style={{
          background: 'rgba(10, 10, 10, 0.85)',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          borderRadius: '4px',
          padding: '4px 8px',
          color: '#e0e0e0',
          fontSize: '10px',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontWeight: 600, color: '#0ea5e9' }}>{watershed.name}</div>
        {watershed.area > 0 && (
          <div style={{ fontSize: '9px', opacity: 0.7 }}>
            {watershed.area.toLocaleString()} km²
          </div>
        )}
      </div>
    </Html>
  );
}

// ─── Main WatershedLayer Component ─────────────────────────────────────

export default function WatershedLayer() {
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);
  const showWaterFeatures = useGlobeStore((s) => s.showWaterFeatures);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const { camera } = useThree();

  const [watersheds, setWatersheds] = useState<ProcessedWatershed[]>([]);
  const [, setCurrentLevel] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastLoadedLevel = useRef(0);

  // Determine which LOD level to show based on zoom
  const targetLevel = useMemo(() => {
    const { lod } = WATERSHED_CONFIG;
    if (zoomDistance >= lod.level1.minDistance) return 1;
    if (zoomDistance >= lod.level2.minDistance) return 2;
    if (zoomDistance >= lod.level3.minDistance) return 3;
    return 4;
  }, [zoomDistance]);

  // Calculate visibility based on camera position
  const visibleWatersheds = useMemo(() => {
    if (!showWaterFeatures || watersheds.length === 0) return [];

    // Get camera look direction
    const cameraDir = camera.position.clone().normalize();
    const cameraLat = Math.asin(cameraDir.y) * (180 / Math.PI);
    const cameraLng = Math.atan2(-cameraDir.z, cameraDir.x) * (180 / Math.PI);

    // Filter to watersheds within view (rough check based on centroid distance)
    const maxAngularDistance = 90 / zoomDistance; // Degrees

    return watersheds.filter((ws) => {
      const [lng, lat] = ws.centroid;
      const latDiff = Math.abs(lat - cameraLat);
      const lngDiff = Math.abs(lng - cameraLng);
      // Simple bounding check (not geodesic but good enough)
      return latDiff < maxAngularDistance && lngDiff < maxAngularDistance * 1.5;
    });
  }, [watersheds, showWaterFeatures, zoomDistance, camera.position]);

  // Load watershed data when level changes
  useEffect(() => {
    if (!showWaterFeatures) return;
    if (targetLevel === lastLoadedLevel.current) return;

    loadWatershedData(targetLevel).then((data) => {
      if (!data?.features) return;

      const processed = data.features
        .map((f, i) => processFeature(f, i))
        .filter((w): w is ProcessedWatershed => w !== null);

      setWatersheds(processed);
      setCurrentLevel(targetLevel);
      lastLoadedLevel.current = targetLevel;
    });
  }, [targetLevel, showWaterFeatures]);

  // Handle watershed click
  const handleClick = useCallback(
    (watershed: ProcessedWatershed) => {
      if (selectedId === watershed.id) {
        setSelectedId(null);
      } else {
        setSelectedId(watershed.id);
        const [lng, lat] = watershed.centroid;
        flyTo(lat, lng, Math.max(1.6, zoomDistance * 0.7));
      }
    },
    [selectedId, flyTo, zoomDistance]
  );

  // Calculate opacity based on zoom
  const layerOpacity = useMemo(() => {
    if (zoomDistance > 4.0) return 0;
    if (zoomDistance > 3.5) return (4.0 - zoomDistance) / 0.5;
    return 1;
  }, [zoomDistance]);

  if (!showWaterFeatures || layerOpacity <= 0 || visibleWatersheds.length === 0) {
    return null;
  }

  const selectedWatershed = selectedId
    ? visibleWatersheds.find((w) => w.id === selectedId)
    : null;
  const hoveredWatershed = hoveredId
    ? visibleWatersheds.find((w) => w.id === hoveredId)
    : null;

  return (
    <group>
      {visibleWatersheds.map((watershed) => (
        <WatershedMesh
          key={watershed.id}
          watershed={watershed}
          isSelected={selectedId === watershed.id}
          isHovered={hoveredId === watershed.id}
          onHover={setHoveredId}
          onClick={handleClick}
        />
      ))}

      {/* Show label for hovered or selected watershed */}
      {hoveredWatershed && !selectedWatershed && (
        <WatershedLabel watershed={hoveredWatershed} isVisible={true} />
      )}
      {selectedWatershed && (
        <WatershedLabel watershed={selectedWatershed} isVisible={true} />
      )}
    </group>
  );
}
