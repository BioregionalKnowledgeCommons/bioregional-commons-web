'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVector3 } from '@/lib/geo-utils';
import { useGlobeStore } from '@/stores/globeStore';
import { useNodes } from '@/hooks/useNodes';
import type { KoiLiveNode } from '@/types';

const ALTITUDE = 0.008;
const BASE_SIZE = 0.006;

const STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  unreachable: '#ef4444',
};

function getZoomScale(zoomDistance: number): number {
  const t = Math.max(0, Math.min(1, (zoomDistance - 1.15) / (4 - 1.15)));
  return 0.3 + t * 0.7;
}

const LABEL_ZOOM_THRESHOLD = 2.2;

export default function LiveNodeMarkers() {
  const { data } = useNodes();
  const selectedNodeId = useGlobeStore((s) => s.selectedNodeId);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);

  const nodes = data?.nodes ?? [];
  const zoomScale = getZoomScale(zoomDistance);
  const showLabels = zoomDistance < LABEL_ZOOM_THRESHOLD;
  // Fade labels in as user zooms closer
  const labelOpacity = showLabels
    ? Math.min(1, (LABEL_ZOOM_THRESHOLD - zoomDistance) / 0.4)
    : 0;

  return (
    <group>
      {nodes.map((node) => (
        <LiveMarker
          key={node.node_id}
          node={node}
          size={BASE_SIZE * zoomScale}
          isSelected={selectedNodeId === node.node_id}
          onSelect={setSelectedNode}
          showLabel={showLabels}
          labelOpacity={labelOpacity}
        />
      ))}
    </group>
  );
}

function LiveMarker({
  node,
  size,
  isSelected,
  onSelect,
  showLabel,
  labelOpacity,
}: {
  node: KoiLiveNode;
  size: number;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  showLabel: boolean;
  labelOpacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo(() => {
    const [lat, lng] = node.centroid;
    return latLngToVector3(lat, lng, 1.0, ALTITUDE);
  }, [node.centroid]);

  const color = STATUS_COLORS[node.status] ?? STATUS_COLORS.unreachable;

  const phaseOffset = useMemo(
    () => node.node_id.charCodeAt(0) + node.node_id.charCodeAt(5),
    [node.node_id]
  );

  // Activity pulse: coordinator nodes with queued events pulse more intensely
  const hasActivity = node.is_coordinator && (node.health?.event_queue_size as number) > 0;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime + phaseOffset;
    const pulseSpeed = hasActivity ? 4.0 : 2.0;
    const pulseAmount = hasActivity ? 0.2 : 0.12;
    const pulse = 1.0 + Math.sin(t * pulseSpeed) * pulseAmount;
    const targetScale = isSelected ? 1.5 : hovered ? 1.25 : pulse;
    const s = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(s + (targetScale - s) * 0.15);

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const glowBase = hasActivity ? 0.35 : 0.25;
      const glowRange = hasActivity ? 0.15 : 0.1;
      mat.opacity = glowBase + Math.sin(t * pulseSpeed) * glowRange;
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(isSelected ? null : node.node_id);
    },
    [node.node_id, isSelected, onSelect]
  );

  // Entity count from health response
  const entityCount = node.health?.entity_types
    ? (node.health.entity_types as string[]).length + ' types'
    : '';

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh ref={glowRef} scale={2.5}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core marker — diamond shape for live nodes (to distinguish from seed nodes) */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <octahedronGeometry args={[size * 1.2, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 1.4 : 0.7}
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>

      {/* Hover label — detailed info */}
      {(hovered || isSelected) && (
        <Html
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            transform: 'translate(-50%, -100%)',
          }}
          position={[0, size * 3 + 0.02, 0]}
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
              maxWidth: '240px',
            }}
          >
            <div style={{ fontWeight: 600, color, marginBottom: '2px' }}>
              {node.display_name}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>
              {node.status === 'healthy' ? 'Live' : 'Offline'}
              {node.is_coordinator ? ' · Coordinator' : ' · Leaf Node'}
              {entityCount && ` · ${entityCount}`}
            </div>
          </div>
        </Html>
      )}

      {/* Always-on label — small name below marker, visible when zoomed in */}
      {showLabel && !hovered && !isSelected && (
        <Html
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            transform: 'translate(-50%, 0)',
          }}
          position={[0, -(size * 3 + 0.01), 0]}
          zIndexRange={[50, 0]}
        >
          <div
            style={{
              color: '#d0d0d0',
              fontSize: '9px',
              fontFamily: 'system-ui, sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              opacity: labelOpacity,
              transition: 'opacity 0.3s ease',
            }}
          >
            {node.display_name}
          </div>
        </Html>
      )}
    </group>
  );
}
