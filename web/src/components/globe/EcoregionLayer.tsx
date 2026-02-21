'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import earcut from 'earcut';
import { latLngToVector3 } from '@/lib/geo-utils';
import { useGlobeStore } from '@/stores/globeStore';
import type { BioregionLookup } from '@/types';
import { assetPath } from '@/lib/constants';

// ─── RESOLVE Ecoregions API ──────────────────────────────────────────
const ECOREGION_API =
  'https://data-gis.unep-wcmc.org/server/rest/services/Bio-geographicalRegions/Resolve_Ecoregions/FeatureServer/0/query';

// ─── Distinct colors for ecoregion fills ─────────────────────────────
// Exported so the BioregionPanel legend can use matching colors.
export const ECO_COLORS = [
  '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#eab308',
];

/** Deterministic color for an eco_id — same everywhere in the app */
export function getEcoColor(ecoId: number): string {
  // Use a simple hash so nearby IDs don't get adjacent colors
  const hash = ((ecoId * 2654435761) >>> 0) % ECO_COLORS.length;
  return ECO_COLORS[hash];
}

// ─── Types ───────────────────────────────────────────────────────────
interface ArcGISFeature {
  attributes: Record<string, string | number | undefined>;
  geometry?: { rings: number[][][] };
}

interface ProcessedEcoregion {
  ecoId: number;
  ecoName: string;
  color: THREE.Color;
  fillGeometries: THREE.BufferGeometry[];
  boundaryGeometries: THREE.BufferGeometry[];
  centroid: [number, number]; // [lng, lat] for click-to-zoom
}

// ─── Geometry helpers ────────────────────────────────────────────────

/** Downsample a ring to at most `maxPts` vertices using uniform sampling */
function simplifyRing(ring: number[][], maxPts: number): number[][] {
  if (ring.length <= maxPts) return ring;
  const step = (ring.length - 1) / (maxPts - 1);
  const out: number[][] = [];
  for (let i = 0; i < maxPts - 1; i++) {
    out.push(ring[Math.round(i * step)]);
  }
  out.push(ring[ring.length - 1]); // always include last point (closing)
  return out;
}

function createBoundaryGeometry(ring: number[][]): THREE.BufferGeometry {
  // Radius above high-res tiles (1.005+) so ecoregions are visible and clickable
  const pts = ring.map(([lng, lat]) => latLngToVector3(lat, lng, 1.012));
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function createFilledGeometry(rings: number[][][]): THREE.BufferGeometry | null {
  const outer = rings[0];
  if (!outer || outer.length < 4) return null;

  const flatCoords: number[] = [];
  const holeIndices: number[] = [];

  for (const [lng, lat] of outer) flatCoords.push(lng, lat);
  for (let i = 1; i < rings.length; i++) {
    holeIndices.push(flatCoords.length / 2);
    for (const [lng, lat] of rings[i]) flatCoords.push(lng, lat);
  }

  const indices = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);
  if (indices.length === 0) return null;

  const totalPts = flatCoords.length / 2;
  const positions = new Float32Array(totalPts * 3);
  // Radius above high-res tiles (1.005+) so ecoregions are visible and clickable
  for (let i = 0; i < totalPts; i++) {
    const pos = latLngToVector3(flatCoords[i * 2 + 1], flatCoords[i * 2], 1.011);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex(Array.from(indices));
  geom.computeVertexNormals();
  return geom;
}

// ─── Fetch + process ecoregion geometries ────────────────────────────

const geometryCache: Record<string, ProcessedEcoregion[]> = {};

async function fetchEcoregionGeometries(
  lng: number,
  lat: number,
  halfDeg: number = 2.5,
): Promise<ProcessedEcoregion[]> {
  try {
    const xmin = lng - halfDeg;
    const ymin = lat - halfDeg;
    const xmax = lng + halfDeg;
    const ymax = lat + halfDeg;

    const envelope = JSON.stringify({
      xmin, ymin, xmax, ymax,
      spatialReference: { wkid: 4326 },
    });
    const params = new URLSearchParams({
      geometry: envelope,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      // Field names are lowercase in this service
      outFields: 'eco_name,biome_name,eco_id',
      returnGeometry: 'true',
      // CRITICAL: request output in WGS84 lat/lng (default is Web Mercator meters)
      outSR: '4326',
      // Simplify geometry: 0.05 degrees ≈ 5km — keeps shapes recognisable
      maxAllowableOffset: '0.05',
      geometryPrecision: '3',
      resultRecordCount: '12',
      f: 'json',
    });

    const res = await fetch(`${ECOREGION_API}?${params}`);
    const data = await res.json();
    if (!data.features?.length) return [];

    const seen = new Set<number>();
    const results: ProcessedEcoregion[] = [];

    for (const feat of data.features as ArcGISFeature[]) {
      const a = feat.attributes;
      const ecoId = (a.eco_id ?? a.ECO_ID ?? 0) as number;
      if (!ecoId || seen.has(ecoId)) continue;
      seen.add(ecoId);

      const rings = feat.geometry?.rings;
      if (!rings || rings.length === 0) continue;

      const ecoName = (a.eco_name ?? a.ECO_NAME ?? `Ecoregion ${ecoId}`) as string;
      const color = new THREE.Color(getEcoColor(ecoId));

      const fillGeometries: THREE.BufferGeometry[] = [];
      const boundaryGeometries: THREE.BufferGeometry[] = [];

      // Calculate centroid from all ring coordinates
      let totalLng = 0;
      let totalLat = 0;
      let pointCount = 0;

      // ArcGIS returns multiple rings: first is outer, rest can be holes
      // or disjoint polygon parts. We treat each ring independently:
      // big rings get their own fill + boundary, tiny rings are skipped.
      for (const ring of rings) {
        if (ring.length < 4) continue;
        const simplified = simplifyRing(ring, 300);
        if (simplified.length < 4) continue;

        // Accumulate for centroid calculation
        for (const [lng, lat] of simplified) {
          totalLng += lng;
          totalLat += lat;
          pointCount++;
        }

        const fill = createFilledGeometry([simplified]);
        if (fill) fillGeometries.push(fill);
        boundaryGeometries.push(createBoundaryGeometry(simplified));
      }

      if (fillGeometries.length === 0 && boundaryGeometries.length === 0) continue;

      const centroid: [number, number] = pointCount > 0
        ? [totalLng / pointCount, totalLat / pointCount]
        : [lng, lat]; // fallback to query center

      results.push({ ecoId, ecoName, color, fillGeometries, boundaryGeometries, centroid });
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Main EcoregionLayer Component ──────────────────────────────────

export default function EcoregionLayer() {
  const showEcoregions = useGlobeStore((s) => s.showEcoregions);
  const selectedBioregion = useGlobeStore((s) => s.selectedBioregion);
  const selectedEcoregion = useGlobeStore((s) => s.selectedEcoregion);
  const setSelectedEcoregion = useGlobeStore((s) => s.setSelectedEcoregion);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const [lookup, setLookup] = useState<BioregionLookup>({});
  const [ecoregions, setEcoregions] = useState<ProcessedEcoregion[]>([]);

  // Load bioregion centroids
  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((r) => r.json())
      .then((d: BioregionLookup) => setLookup(d))
      .catch(() => {});
  }, []);

  // Fetch ecoregion geometries when bioregion is selected
  useEffect(() => {
    if (!showEcoregions || !selectedBioregion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEcoregions([]);
      return;
    }

    const bio = lookup[selectedBioregion];
    if (!bio) return;

    const cacheKey = selectedBioregion;
    if (geometryCache[cacheKey]) {
      setEcoregions(geometryCache[cacheKey]);
      return;
    }

    let cancelled = false;
    const [lng, lat] = bio.centroid;
    fetchEcoregionGeometries(lng, lat).then((results) => {
      if (cancelled) return;
      geometryCache[cacheKey] = results;
      setEcoregions(results);
    });

    return () => { cancelled = true; };
  }, [showEcoregions, selectedBioregion, lookup]);

  // Clean up geometries when ecoregions change
  const prevEcoRef = useRef<ProcessedEcoregion[]>([]);
  useEffect(() => {
    // Dispose old geometries to free GPU memory
    for (const eco of prevEcoRef.current) {
      for (const g of eco.fillGeometries) g.dispose();
      for (const g of eco.boundaryGeometries) g.dispose();
    }
    prevEcoRef.current = ecoregions;
  }, [ecoregions]);

  if (!showEcoregions || !selectedBioregion || ecoregions.length === 0) return null;

  // Handle ecoregion click - select and zoom
  const handleEcoregionClick = (eco: ProcessedEcoregion) => {
    setSelectedEcoregion(eco.ecoId);
    // Zoom to ecoregion centroid at a tighter zoom level (1.4 = quite close)
    flyTo(eco.centroid[1], eco.centroid[0], 1.4);
  };

  return (
    <group>
      {ecoregions.map((eco) => (
        <EcoregionMesh
          key={eco.ecoId}
          eco={eco}
          isSelected={selectedEcoregion === eco.ecoId}
          onClick={() => handleEcoregionClick(eco)}
        />
      ))}
    </group>
  );
}

// ─── Individual Ecoregion Mesh ──────────────────────────────────────

interface EcoregionMeshProps {
  eco: ProcessedEcoregion;
  isSelected: boolean;
  onClick: () => void;
}

function EcoregionMesh({ eco, isSelected, onClick }: EcoregionMeshProps) {
  const fillGroupRef = useRef<THREE.Group>(null);
  const lineGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const targetFill = isSelected ? 0.35 : 0.18;
    const targetLine = isSelected ? 1.0 : 0.65;

    if (fillGroupRef.current) {
      for (const child of fillGroupRef.current.children) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity += (targetFill - mat.opacity) * 0.12;
      }
    }
    if (lineGroupRef.current) {
      for (const child of lineGroupRef.current.children) {
        const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
        mat.opacity += (targetLine - mat.opacity) * 0.12;
      }
    }
  });

  const lineColor = useMemo(() => {
    return eco.color.clone().multiplyScalar(isSelected ? 1.6 : 1.3);
  }, [eco.color, isSelected]);

  return (
    <group>
      <group ref={fillGroupRef}>
        {eco.fillGeometries.map((geom, i) => (
          <mesh
            key={`f-${i}`}
            geometry={geom}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
          >
            <meshBasicMaterial
              color={eco.color}
              transparent
              opacity={0.18}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <group ref={lineGroupRef}>
        {eco.boundaryGeometries.map((geom, i) => (
          <lineLoop key={`l-${i}`} geometry={geom}>
            <lineBasicMaterial
              color={lineColor}
              transparent
              opacity={0.65}
              linewidth={1}
            />
          </lineLoop>
        ))}
      </group>
    </group>
  );
}
