'use client';

import { useRef, useMemo, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { greatCirclePoints } from '@/lib/geo-utils';
import { useNodes } from '@/hooks/useNodes';
import { useFederation } from '@/hooks/useFederation';
import { useGlobeStore } from '@/stores/globeStore';
import type { KoiLiveNode, KoiFederationEdge } from '@/types';

// Map node RID prefixes to node_ids for edge resolution
function ridToNodeId(rid: string): string | null {
  const ridLower = rid.toLowerCase();
  if (ridLower.includes('octo-salish-sea') || ridLower.includes('octo')) {
    return 'octo-salish-sea';
  }
  if (ridLower.includes('greater-victoria')) {
    return 'greater-victoria';
  }
  if (ridLower.includes('front-range')) {
    return 'front-range';
  }
  if (ridLower.includes('cowichan-valley') || ridLower.includes('cowichan')) {
    return 'cowichan-valley';
  }
  return null;
}

const EDGE_TYPE_COLORS: Record<string, string> = {
  POLL: '#60a5fa',
  PUSH: '#22c55e',
};

const DEFAULT_ARC_COLOR = '#60a5fa';

interface ArcDatum {
  edge: KoiFederationEdge;
  sourceNode: KoiLiveNode;
  targetNode: KoiLiveNode;
  points: THREE.Vector3[];
  edgeCount: number;
  color: string;
}

export default function FederationArcs() {
  const showFederation = useGlobeStore((s) => s.showFederation);
  const setHoveredFlow = useGlobeStore((s) => s.setHoveredFlow);
  const { data: nodesData } = useNodes();
  const { data: fedData } = useFederation();

  const arcData = useMemo(() => {
    const nodes = nodesData?.nodes ?? [];
    const edges = fedData?.edges ?? [];
    if (nodes.length === 0 || edges.length === 0) return [];

    const nodeMap = new Map<string, KoiLiveNode>();
    for (const n of nodes) nodeMap.set(n.node_id, n);

    // Count edges per node pair for thickness scaling
    const pairCounts = new Map<string, number>();
    for (const edge of edges) {
      const sourceId = ridToNodeId(edge.source_node);
      const targetId = ridToNodeId(edge.target_node);
      if (!sourceId || !targetId || sourceId === targetId) continue;
      if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) continue;
      const pairKey = [sourceId, targetId].sort().join(':');
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
    }

    const seen = new Set<string>();
    const arcs: ArcDatum[] = [];

    for (const edge of edges) {
      const sourceId = ridToNodeId(edge.source_node);
      const targetId = ridToNodeId(edge.target_node);
      // Skip unknown nodes (e.g. koi-coordinator-main) and self-edges
      if (!sourceId || !targetId || sourceId === targetId) continue;

      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      if (!sourceNode || !targetNode) continue;

      // Deduplicate: one arc per node pair
      const pairKey = [sourceId, targetId].sort().join(':');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      // For POLL edges: source_node = provider, target_node = poller
      // Data flows source → target. Particles travel source → target.
      const points = greatCirclePoints(
        [sourceNode.centroid[1], sourceNode.centroid[0]],
        [targetNode.centroid[1], targetNode.centroid[0]],
        60,
        0.15
      );

      const edgeType = edge.edge_type?.toUpperCase() ?? 'POLL';
      const color = EDGE_TYPE_COLORS[edgeType] ?? DEFAULT_ARC_COLOR;
      const edgeCount = pairCounts.get(pairKey) ?? 1;

      arcs.push({ edge, sourceNode, targetNode, points, edgeCount, color });
    }

    return arcs;
  }, [nodesData, fedData]);

  const handleArcHover = useCallback(
    (arc: ArcDatum | null) => {
      if (!arc) {
        setHoveredFlow(null);
        return;
      }
      setHoveredFlow({
        sourceId: arc.sourceNode.node_id,
        targetId: arc.targetNode.node_id,
        edgeType: arc.edge.edge_type?.toUpperCase() ?? 'POLL',
        sourceName: arc.sourceNode.display_name,
        targetName: arc.targetNode.display_name,
      });
    },
    [setHoveredFlow]
  );

  if (!showFederation || arcData.length === 0) return null;

  return (
    <group>
      {arcData.map((arc, i) => (
        <FederationArc
          key={`fed-${i}`}
          arc={arc}
          index={i}
          onHover={handleArcHover}
        />
      ))}
    </group>
  );
}

function FederationArc({
  arc,
  index,
  onHover,
}: {
  arc: ArcDatum;
  index: number;
  onHover: (arc: ArcDatum | null) => void;
}) {
  const particleRef = useRef<THREE.Mesh>(null);
  const particle2Ref = useRef<THREE.Mesh>(null);

  const { points, color, edgeCount } = arc;

  const pointsArray = useMemo(
    () => points.map((p) => [p.x, p.y, p.z] as [number, number, number]),
    [points]
  );

  // Line width scales with edge count between same pair
  const lineWidth = Math.min(1.0 + edgeCount * 0.5, 3.0);

  // Animate particles directionally along the arc (source → target)
  useFrame(({ clock }) => {
    const speed = 0.12;
    const len = points.length - 1;

    // Primary particle
    if (particleRef.current && len > 0) {
      const t = ((clock.elapsedTime * speed + index * 0.4) % 1.0 + 1.0) % 1.0;
      const segIndex = Math.floor(t * len);
      const segT = t * len - segIndex;
      const p0 = points[Math.min(segIndex, len)];
      const p1 = points[Math.min(segIndex + 1, len)];
      particleRef.current.position.lerpVectors(p0, p1, segT);
      const pulse = 1.0 + Math.sin(clock.elapsedTime * 5 + index) * 0.3;
      particleRef.current.scale.setScalar(pulse);
    }

    // Second particle offset by 0.5 for continuous flow feel
    if (particle2Ref.current && len > 0) {
      const t = ((clock.elapsedTime * speed + index * 0.4 + 0.5) % 1.0 + 1.0) % 1.0;
      const segIndex = Math.floor(t * len);
      const segT = t * len - segIndex;
      const p0 = points[Math.min(segIndex, len)];
      const p1 = points[Math.min(segIndex + 1, len)];
      particle2Ref.current.position.lerpVectors(p0, p1, segT);
      const pulse = 1.0 + Math.sin(clock.elapsedTime * 5 + index + Math.PI) * 0.3;
      particle2Ref.current.scale.setScalar(pulse);
    }
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(arc);
      document.body.style.cursor = 'pointer';
    },
    [arc, onHover]
  );

  const handlePointerOut = useCallback(() => {
    onHover(null);
    document.body.style.cursor = 'auto';
  }, [onHover]);

  return (
    <group>
      {/* Invisible wider line for hover hit area */}
      <Line
        points={pointsArray}
        color={color}
        lineWidth={lineWidth + 4}
        opacity={0}
        transparent
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* Visible arc line */}
      <Line
        points={pointsArray}
        color={color}
        lineWidth={lineWidth}
        opacity={0.4}
        transparent
      />

      {/* Primary travelling particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Secondary travelling particle for continuous flow */}
      <mesh ref={particle2Ref}>
        <sphereGeometry args={[0.004, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
