'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { greatCirclePoints } from '@/lib/geo-utils';
import { useNodes } from '@/hooks/useNodes';
import { useFederation } from '@/hooks/useFederation';
import { useGlobeStore } from '@/stores/globeStore';
import type { KoiLiveNode, KoiFederationEdge } from '@/types';

// Map node RID prefixes to node_ids for edge resolution
function ridToNodeId(rid: string): string | null {
  // Match by checking if the RID contains the node display name (simplified)
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
  // Fallback: check centroid match
  return null;
}

const ARC_COLOR = '#60a5fa'; // Blue for federation edges

export default function FederationArcs() {
  const showFlowArcs = useGlobeStore((s) => s.showFlowArcs);
  const { data: nodesData } = useNodes();
  const { data: fedData } = useFederation();

  // Build unique node pairs from edges (deduplicate bidirectional)
  const arcData = useMemo(() => {
    const nodes = nodesData?.nodes ?? [];
    const edges = fedData?.edges ?? [];
    if (nodes.length === 0 || edges.length === 0) return [];

    const nodeMap = new Map<string, KoiLiveNode>();
    for (const n of nodes) nodeMap.set(n.node_id, n);

    const seen = new Set<string>();
    const arcs: {
      edge: KoiFederationEdge;
      sourceNode: KoiLiveNode;
      targetNode: KoiLiveNode;
      points: THREE.Vector3[];
    }[] = [];

    for (const edge of edges) {
      const sourceId = ridToNodeId(edge.source_node);
      const targetId = ridToNodeId(edge.target_node);
      if (!sourceId || !targetId || sourceId === targetId) continue;

      // Deduplicate bidirectional edges
      const pairKey = [sourceId, targetId].sort().join(':');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      if (!sourceNode || !targetNode) continue;

      // centroid is [lat, lng], greatCirclePoints expects [lng, lat]
      const points = greatCirclePoints(
        [sourceNode.centroid[1], sourceNode.centroid[0]],
        [targetNode.centroid[1], targetNode.centroid[0]],
        60,
        0.15
      );

      arcs.push({ edge, sourceNode, targetNode, points });
    }

    return arcs;
  }, [nodesData, fedData]);

  if (!showFlowArcs || arcData.length === 0) return null;

  return (
    <group>
      {arcData.map((arc, i) => (
        <FederationArc key={`fed-${i}`} points={arc.points} index={i} />
      ))}
    </group>
  );
}

function FederationArc({
  points,
  index,
}: {
  points: THREE.Vector3[];
  index: number;
}) {
  const particleRef = useRef<THREE.Mesh>(null);

  const pointsArray = useMemo(
    () => points.map((p) => [p.x, p.y, p.z] as [number, number, number]),
    [points]
  );

  // Animate particle along the arc
  useFrame(({ clock }) => {
    if (!particleRef.current || points.length < 2) return;
    const speed = 0.12;
    const t = ((clock.elapsedTime * speed + index * 0.4) % 1.0 + 1.0) % 1.0;
    const segIndex = Math.floor(t * (points.length - 1));
    const segT = t * (points.length - 1) - segIndex;
    const p0 = points[Math.min(segIndex, points.length - 1)];
    const p1 = points[Math.min(segIndex + 1, points.length - 1)];
    particleRef.current.position.lerpVectors(p0, p1, segT);
    const pulse = 1.0 + Math.sin(clock.elapsedTime * 5 + index) * 0.3;
    particleRef.current.scale.setScalar(pulse);
  });

  return (
    <group>
      {/* Base arc line */}
      <Line
        points={pointsArray}
        color={ARC_COLOR}
        lineWidth={1.5}
        opacity={0.4}
        transparent
      />

      {/* Travelling particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshBasicMaterial
          color={ARC_COLOR}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
