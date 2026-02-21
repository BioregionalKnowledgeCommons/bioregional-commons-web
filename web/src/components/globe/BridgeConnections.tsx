'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { seedBridges, seedNodes, getNodePosition } from '@/data/seed-registry';
import { greatCirclePoints } from '@/lib/geo-utils';
import { useGlobeStore } from '@/stores/globeStore';
import type { BridgeEntry, NodeEntry } from '@/types';

// Colors by review status
const BRIDGE_STATUS_COLORS: Record<string, string> = {
  recent: '#2ecc71',
  approaching: '#f1c40f',
  stale: '#95a5a6',
};

// Build a quick lookup map: node_id → NodeEntry
const nodeMap = new Map<string, NodeEntry>();
seedNodes.forEach((n) => nodeMap.set(n.node_id, n));

interface BridgeArcData {
  bridge: BridgeEntry;
  points: [number, number, number][];
  color: string;
}

export default function BridgeConnections() {
  const showBridges = useGlobeStore((s) => s.showBridges);

  // Pre-compute all bridge arc data
  const arcs = useMemo<BridgeArcData[]>(() => {
    return seedBridges
      .map((bridge) => {
        const sourceNode = nodeMap.get(bridge.source_node_id);
        const targetNode = nodeMap.get(bridge.target_node_id);
        if (!sourceNode || !targetNode) return null;

        const sourceCoords = getNodePosition(sourceNode);
        const targetCoords = getNodePosition(targetNode);
        if (!sourceCoords || !targetCoords) return null;

        // Use a lower arc height for bridges to distinguish from flow arcs
        const pts = greatCirclePoints(
          [sourceCoords[0], sourceCoords[1]],
          [targetCoords[0], targetCoords[1]],
          40,
          0.08
        );

        const color = BRIDGE_STATUS_COLORS[bridge.review_status] || '#95a5a6';

        return {
          bridge,
          points: pts.map((p) => [p.x, p.y, p.z] as [number, number, number]),
          color,
        };
      })
      .filter(Boolean) as BridgeArcData[];
  }, []);

  if (!showBridges) return null;

  return (
    <group>
      {arcs.map((arc) => (
        <Line
          key={arc.bridge.bridge_id}
          points={arc.points}
          color={arc.color}
          lineWidth={1.5}
          transparent
          opacity={0.5}
          dashed
          dashSize={0.03}
          dashScale={1}
          gapSize={0.02}
        />
      ))}
    </group>
  );
}
