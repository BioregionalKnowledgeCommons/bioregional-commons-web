'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import earcut from 'earcut';
import { latLngToVector3 } from '@/lib/geo-utils';
import { assetPath } from '@/lib/constants';
import { REALM_COLORS, type Realm } from '@/types';
import { useGlobeStore } from '@/stores/globeStore';
import { LIVE_ONLY } from '@/lib/feature-flags';
import { useNodes } from '@/hooks/useNodes';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

// ─── Types for simplified GeoJSON ──────────────────────────────────────
interface BioregionFeature {
  type: 'Feature';
  properties: {
    code: string;
    name: string;
    realm: string;
    realm_name: string;
    subrealm: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface BioregionGeoJSON {
  type: 'FeatureCollection';
  features: BioregionFeature[];
}

// ─── Realm code to Realm name mapping ──────────────────────────────────
const REALM_CODE_MAP: Record<string, Realm> = {
  NA: 'Nearctic',
  PA: 'Palearctic',
  NT: 'Neotropic',
  AT: 'Afrotropic',
  IM: 'Indomalayan',
  AU: 'Australasia',
  OC: 'Oceanian',
  AN: 'Antarctic',
};

// ─── Convert a polygon ring to 3D points on sphere ─────────────────────
// Altitude above high-res tiles (1.005+) so bioregions are visible over satellite
function ringToSpherePoints(ring: number[][], altitude: number = 0.008): THREE.Vector3[] {
  return ring.map(([lng, lat]) => latLngToVector3(lat, lng, 1.0 + altitude));
}

// ─── Create line geometry from a polygon ring ──────────────────────────
function createBoundaryGeometry(ring: number[][]): THREE.BufferGeometry {
  const points = ringToSpherePoints(ring, 0.009);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}

// ─── Triangulate a polygon ring and create a filled mesh on the sphere ─
function createFilledGeometry(rings: number[][][]): THREE.BufferGeometry | null {
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

  // Altitude above high-res tiles (1.005+) so bioregions are visible over satellite
  for (let i = 0; i < totalPoints; i++) {
    const lng = flatCoords[i * 2];
    const lat = flatCoords[i * 2 + 1];
    const pos = latLngToVector3(lat, lng, 1.008);
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
interface ProcessedBioregion {
  code: string;
  name: string;
  realmCode: string;
  realmName: string;
  subrealm: string;
  color: THREE.Color;
  boundaryGeometries: THREE.BufferGeometry[];
  fillGeometries: THREE.BufferGeometry[];
}

function processFeature(feature: BioregionFeature): ProcessedBioregion {
  const { code, name, realm, realm_name, subrealm } = feature.properties;
  const realmName = REALM_CODE_MAP[realm] || 'Nearctic';
  const colorHex = REALM_COLORS[realmName] || '#7F8C8D';
  const color = new THREE.Color(colorHex);

  const boundaryGeometries: THREE.BufferGeometry[] = [];
  const fillGeometries: THREE.BufferGeometry[] = [];

  if (feature.geometry.type === 'Polygon') {
    const rings = feature.geometry.coordinates as number[][][];
    // Boundary for outer ring
    if (rings[0] && rings[0].length >= 4) {
      boundaryGeometries.push(createBoundaryGeometry(rings[0]));
      const fill = createFilledGeometry(rings);
      if (fill) fillGeometries.push(fill);
    }
  } else if (feature.geometry.type === 'MultiPolygon') {
    const polygons = feature.geometry.coordinates as number[][][][];
    for (const polygon of polygons) {
      if (polygon[0] && polygon[0].length >= 4) {
        boundaryGeometries.push(createBoundaryGeometry(polygon[0]));
        const fill = createFilledGeometry(polygon);
        if (fill) fillGeometries.push(fill);
      }
    }
  }

  return {
    code,
    name,
    realmCode: realm,
    realmName: realm_name,
    subrealm,
    color,
    boundaryGeometries,
    fillGeometries,
  };
}

// ─── Main BioregionLayer Component ─────────────────────────────────────
export default function BioregionLayer() {
  const showBioregions = useGlobeStore((s) => s.showBioregions);
  const hoveredBioregion = useGlobeStore((s) => s.hoveredBioregion);
  const selectedBioregion = useGlobeStore((s) => s.selectedBioregion);
  const setHoveredBioregion = useGlobeStore((s) => s.setHoveredBioregion);
  const setSelectedBioregion = useGlobeStore((s) => s.setSelectedBioregion);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const [geoData, setGeoData] = useState<BioregionGeoJSON | null>(null);
  const [bioregionCentroids, setBioregionCentroids] = useState<Record<string, [number, number]>>({});

  // Load GeoJSON on mount
  useEffect(() => {
    fetch(assetPath('/data/bioregions-simplified.json'))
      .then((res) => res.json())
      .then((data: BioregionGeoJSON) => setGeoData(data))
      .catch((err) => console.error('Failed to load bioregion data:', err));
  }, []);

  // Load centroids for flying to bioregions
  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((res) => res.json())
      .then((data: Record<string, { centroid: [number, number] }>) => {
        const centroids: Record<string, [number, number]> = {};
        for (const [code, info] of Object.entries(data)) {
          centroids[code] = info.centroid;
        }
        setBioregionCentroids(centroids);
      })
      .catch(() => {});
  }, []);

  // Handle click on a bioregion
  const handleClick = useCallback(
    (code: string) => {
      setSelectedBioregion(code);
      // Fly to centroid
      const centroid = bioregionCentroids[code];
      if (centroid) {
        const [lng, lat] = centroid;
        flyTo(lat, lng, 2.0);
      }
    },
    [setSelectedBioregion, flyTo, bioregionCentroids]
  );

  // Process all features into renderable data
  const bioregions = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map(processFeature);
  }, [geoData]);

  if (!showBioregions || bioregions.length === 0) return null;

  return (
    <group>
      {bioregions.map((bio) => (
        <BioregionMesh
          key={bio.code}
          bioregion={bio}
          isHovered={hoveredBioregion === bio.code}
          isSelected={selectedBioregion === bio.code}
          anySelected={selectedBioregion !== null}
          onHover={setHoveredBioregion}
          onClick={handleClick}
        />
      ))}
    </group>
  );
}

// ─── Individual Bioregion Mesh ─────────────────────────────────────────
interface BioregionMeshProps {
  bioregion: ProcessedBioregion;
  isHovered: boolean;
  isSelected: boolean;
  anySelected: boolean;
  onHover: (code: string | null) => void;
  onClick: (code: string) => void;
}

function BioregionMesh({ bioregion, isHovered, isSelected, anySelected, onHover, onClick }: BioregionMeshProps) {
  const fillGroupRef = useRef<THREE.Group>(null);
  const lineGroupRef = useRef<THREE.Group>(null);
  const { data: nodesData } = useNodes();

  // Count nodes in this bioregion
  const nodeCount = useMemo(() => {
    if (LIVE_ONLY) {
      const liveNodes = nodesData?.nodes ?? [];
      return liveNodes.filter((n) => n.bioregion_codes.includes(bioregion.code)).length;
    }
    const seedNodes = seedImports?.seedNodes ?? [];
    return seedNodes.filter((n: { bioregion_codes: string[] }) => n.bioregion_codes.includes(bioregion.code)).length;
  }, [bioregion.code, nodesData]);

  // Animate fill opacity, line opacity, and fill scale based on selection + hover
  useFrame(() => {
    if (!fillGroupRef.current) return;

    // Determine target fill opacity
    let targetFillOpacity: number;
    if (isSelected) {
      targetFillOpacity = 0.4;
    } else if (isHovered) {
      targetFillOpacity = 0.35;
    } else if (anySelected) {
      // Dim non-selected bioregions when something is selected
      targetFillOpacity = nodeCount > 0 ? 0.06 : 0.03;
    } else {
      targetFillOpacity = nodeCount > 0 ? 0.15 : 0.08;
    }

    // Target fill mesh scale for glow effect
    const targetScale = isSelected ? 1.003 : 1.001;

    fillGroupRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetFillOpacity - mat.opacity) * 0.12;
      // Smooth scale transition
      const s = mesh.scale.x;
      mesh.scale.setScalar(s + (targetScale - s) * 0.1);
    });

    if (!lineGroupRef.current) return;

    // Determine target line opacity
    let targetLineOpacity: number;
    if (isSelected) {
      targetLineOpacity = 1.0;
    } else if (isHovered) {
      targetLineOpacity = 0.8;
    } else if (anySelected) {
      targetLineOpacity = nodeCount > 0 ? 0.2 : 0.1;
    } else {
      targetLineOpacity = nodeCount > 0 ? 0.45 : 0.2;
    }

    lineGroupRef.current.children.forEach((child) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity += (targetLineOpacity - mat.opacity) * 0.12;
    });
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      // Don't capture hover if this bioregion is already selected
      if (isSelected) return;
      e.stopPropagation();
      onHover(bioregion.code);
      document.body.style.cursor = 'pointer';
    },
    [bioregion.code, onHover, isSelected]
  );

  const handlePointerOut = useCallback(() => {
    if (isSelected) return;
    onHover(null);
    document.body.style.cursor = 'default';
  }, [onHover, isSelected]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      // Don't intercept clicks if this bioregion is already selected
      // (allows clicking through to ecoregions)
      if (isSelected) return;
      e.stopPropagation();
      onClick(bioregion.code);
    },
    [bioregion.code, onClick, isSelected]
  );

  // Brighter color for lines — extra bright when selected
  const lineColor = useMemo(() => {
    const c = bioregion.color.clone();
    c.multiplyScalar(isSelected ? 1.5 : 1.3);
    return c;
  }, [bioregion.color, isSelected]);

  return (
    <group>
      {/* Filled polygons */}
      <group ref={fillGroupRef}>
        {bioregion.fillGeometries.map((geom, i) => (
          <mesh
            key={`fill-${i}`}
            geometry={geom}
            scale={1.001}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <meshBasicMaterial
              color={bioregion.color}
              transparent
              opacity={nodeCount > 0 ? 0.15 : 0.08}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Boundary lines */}
      <group ref={lineGroupRef}>
        {bioregion.boundaryGeometries.map((geom, i) => (
          <lineLoop key={`line-${i}`} geometry={geom}>
            <lineBasicMaterial
              color={lineColor}
              transparent
              opacity={nodeCount > 0 ? 0.45 : 0.2}
              linewidth={1}
            />
          </lineLoop>
        ))}
      </group>
    </group>
  );
}
