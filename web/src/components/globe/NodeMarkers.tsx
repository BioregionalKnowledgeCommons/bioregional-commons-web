'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import earcut from 'earcut';
import { seedNodes, getNodePosition } from '@/data/seed-registry';
import { latLngToVector3, getClusterOffset } from '@/lib/geo-utils';
import { DOMAIN_COLORS } from '@/types';
import type { NodeEntry } from '@/types';
import { useGlobeStore } from '@/stores/globeStore';

// Base size at max zoom out (distance ~5)
const BASE_MARKER_SIZE = 0.004;
const TAG_SCALE_FACTOR = 0.0005;
const ALTITUDE = 0.008; // Hover just above the sphere surface

// Calculate zoom-based scale factor
// At distance 5 (zoomed out): scale = 1
// At distance 1.15 (zoomed in): scale = 0.3 (markers get smaller relative to globe)
function getZoomScale(zoomDistance: number): number {
  const t = Math.max(0, Math.min(1, (zoomDistance - 1.15) / (4 - 1.15)));
  return 0.3 + t * 0.7; // Range: 0.3 to 1.0
}

export default function NodeMarkers() {
  const selectedNodeId = useGlobeStore((s) => s.selectedNodeId);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);

  // Pre-compute node positions and sizes with cluster offsets
  const nodeData = useMemo(() => {
    // Group nodes by their primary bioregion code
    const bioregionGroups = new Map<string, NodeEntry[]>();
    for (const node of seedNodes) {
      const code = node.bioregion_codes[0];
      if (!code) continue;
      const group = bioregionGroups.get(code) || [];
      group.push(node);
      bioregionGroups.set(code, group);
    }

    return seedNodes
      .map((node) => {
        const coords = getNodePosition(node);
        if (!coords) return null;
        const [lng, lat] = coords;

        // Apply cluster offset if multiple nodes share a bioregion
        const code = node.bioregion_codes[0];
        const group = bioregionGroups.get(code) || [];
        const indexInGroup = group.indexOf(node);
        const [lngOffset, latOffset] = getClusterOffset(indexInGroup, group.length);

        const position = latLngToVector3(lat + latOffset, lng + lngOffset, 1.0, ALTITUDE);
        const baseSize = BASE_MARKER_SIZE + node.topic_tags.length * TAG_SCALE_FACTOR;
        const color = DOMAIN_COLORS[node.thematic_domain] || '#7F8C8D';
        return { node, position, baseSize, color, lat: lat + latOffset, lng: lng + lngOffset };
      })
      .filter(Boolean) as {
      node: NodeEntry;
      position: THREE.Vector3;
      baseSize: number;
      color: string;
      lat: number;
      lng: number;
    }[];
  }, []);

  const zoomScale = getZoomScale(zoomDistance);

  return (
    <group>
      {nodeData.map(({ node, position, baseSize, color, lat, lng }) => (
        <NodeMarker
          key={node.node_id}
          node={node}
          position={position}
          size={baseSize * zoomScale}
          color={color}
          isSelected={selectedNodeId === node.node_id}
          onSelect={setSelectedNode}
          zoomDistance={zoomDistance}
          lat={lat}
          lng={lng}
        />
      ))}
    </group>
  );
}

// ─── Territory Polygon Component ──────────────────────────────────────
interface TerritoryPolygonProps {
  boundary: [number, number][];
  color: string;
  opacity: number;
}

function TerritoryPolygon({ boundary, color, opacity }: TerritoryPolygonProps) {
  // Create filled polygon geometry
  const { fillGeometry, boundaryPoints } = useMemo(() => {
    if (boundary.length < 3) return { fillGeometry: null, boundaryPoints: [] };

    const radius = 1.006; // Slightly above globe surface

    // Create boundary line points
    const points: [number, number, number][] = boundary.map(([lng, lat]) => {
      const vec = latLngToVector3(lat, lng, radius);
      return [vec.x, vec.y, vec.z];
    });
    // Close the loop
    if (points.length > 0) {
      points.push(points[0]);
    }

    // Create filled geometry using earcut triangulation
    const flatCoords: number[] = [];
    for (const [lng, lat] of boundary) {
      flatCoords.push(lng, lat);
    }

    const indices = earcut(flatCoords, undefined, 2);
    if (indices.length === 0) return { fillGeometry: null, boundaryPoints: points };

    const positions = new Float32Array(boundary.length * 3);
    for (let i = 0; i < boundary.length; i++) {
      const [lng, lat] = boundary[i];
      const pos = latLngToVector3(lat, lng, 1.005);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(Array.from(indices));
    geom.computeVertexNormals();

    return { fillGeometry: geom, boundaryPoints: points };
  }, [boundary]);

  if (boundaryPoints.length < 3) return null;

  return (
    <group>
      {/* Filled polygon */}
      {fillGeometry && (
        <mesh geometry={fillGeometry}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity * 0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Boundary outline */}
      <Line
        points={boundaryPoints}
        color={color}
        lineWidth={2}
        transparent
        opacity={opacity * 0.8}
      />
    </group>
  );
}

// ─── Individual Node Marker ───────────────────────────────────────────
interface NodeMarkerProps {
  node: NodeEntry;
  position: THREE.Vector3;
  size: number;
  color: string;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  zoomDistance: number;
  lat: number;
  lng: number;
}

function NodeMarker({ node, position, size, color, isSelected, onSelect, zoomDistance }: NodeMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Unique phase offset so markers don't all pulse in sync
  const phaseOffset = useMemo(
    () => node.node_id.charCodeAt(0) + node.node_id.charCodeAt(5),
    [node.node_id]
  );

  // Show territory polygon when zoomed in close enough
  const showTerritory = zoomDistance < 2.0 && node.territory_boundary && node.territory_boundary.length >= 3;
  const territoryOpacity = useMemo(() => {
    if (zoomDistance > 2.0) return 0;
    if (zoomDistance < 1.5) return 1;
    return (2.0 - zoomDistance) / 0.5;
  }, [zoomDistance]);

  // Pulse animation
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime + phaseOffset;
    const pulse = 1.0 + Math.sin(t * 2.0) * 0.12;
    const targetScale = isSelected ? 1.5 : hovered ? 1.25 : pulse;
    const s = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(s + (targetScale - s) * 0.15);

    // Glow pulse
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.2 + Math.sin(t * 2.0) * 0.1;
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(isSelected ? null : node.node_id);
    },
    [node.node_id, isSelected, onSelect]
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = 'pointer';
    },
    []
  );

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  return (
    <group>
      {/* Territory polygon (shown when zoomed in) */}
      {showTerritory && node.territory_boundary && (
        <TerritoryPolygon
          boundary={node.territory_boundary}
          color={color}
          opacity={territoryOpacity}
        />
      )}

      {/* Marker at center */}
      <group position={position}>
        {/* Outer glow sphere */}
        <mesh ref={glowRef} scale={2.0}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Core marker sphere */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[size, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered || isSelected ? 1.2 : 0.6}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>

        {/* Hover label - fixed size, positioned above marker */}
        {(hovered || isSelected) && (
          <Html
            style={{
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              transform: 'translate(-50%, -100%)',
            }}
            position={[0, size * 2 + 0.02, 0]}
            zIndexRange={[100, 0]}
          >
            <div
              style={{
                background: 'rgba(10, 10, 10, 0.95)',
                border: `1px solid ${color}`,
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#e0e0e0',
                fontSize: '12px',
                fontFamily: 'system-ui, sans-serif',
                boxShadow: `0 0 12px ${color}44`,
                marginBottom: '8px',
                maxWidth: '220px',
              }}
            >
              <div style={{ fontWeight: 600, color, marginBottom: '2px' }}>{node.display_name}</div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                {node.thematic_domain.replace(/-/g, ' ')} · {node.topic_tags.length} tags
              </div>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
