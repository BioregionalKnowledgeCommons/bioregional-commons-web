'use client';

import { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { seedFlows, seedNodes, getNodePosition } from '@/data/seed-registry';
import { greatCirclePoints } from '@/lib/geo-utils';
import { useGlobeStore } from '@/stores/globeStore';
import type { Flow, NodeEntry } from '@/types';

// Colors by flow type
const FLOW_COLORS: Record<string, string> = {
  contribution: '#00d4ff',
  fork: '#ffa500',
};

// Build a quick lookup map: node_id → NodeEntry
const nodeMap = new Map<string, NodeEntry>();
seedNodes.forEach((n) => nodeMap.set(n.node_id, n));

interface FlowArcData {
  flow: Flow;
  points: THREE.Vector3[];
  color: string;
  opacity: number;
  width: number;
}

export default function FlowArcs() {
  const showFlowArcs = useGlobeStore((s) => s.showFlowArcs);
  const setHoveredFlow = useGlobeStore((s) => s.setHoveredFlow);

  // Capture current time outside useMemo so Date.now() isn't called during render
  const [now] = useState(() => Date.now());

  // Pre-compute all arc data
  const arcs = useMemo<FlowArcData[]>(() => {
    return seedFlows.flows
      .map((flow) => {
        const sourceNode = nodeMap.get(flow.source_node_id);
        const targetNode = nodeMap.get(flow.target_node_id);
        if (!sourceNode || !targetNode) return null;

        const sourceCoords = getNodePosition(sourceNode);
        const targetCoords = getNodePosition(targetNode);
        if (!sourceCoords || !targetCoords) return null;

        // greatCirclePoints expects [lng, lat]
        const points = greatCirclePoints(
          [sourceCoords[0], sourceCoords[1]],
          [targetCoords[0], targetCoords[1]],
          60,
          0.12 + flow.volume * 0.005
        );

        // Recency-based opacity
        const daysSinceActivity = Math.max(
          0,
          (now - new Date(flow.last_activity).getTime()) / (1000 * 60 * 60 * 24)
        );
        const opacity = Math.max(0.2, 1.0 - daysSinceActivity / 30);

        const color = FLOW_COLORS[flow.flow_type] || '#00d4ff';
        const width = Math.max(1, Math.min(4, flow.volume * 0.3));

        return { flow, points, color, opacity, width };
      })
      .filter(Boolean) as FlowArcData[];
  }, [now]);

  if (!showFlowArcs) return null;

  return (
    <group>
      {arcs.map((arc, i) => (
        <FlowArc key={`flow-${i}`} arc={arc} index={i} onHoverFlow={setHoveredFlow} />
      ))}
    </group>
  );
}

// ─── Single Animated Flow Arc ─────────────────────────────────────────
function FlowArc({
  arc,
  index,
  onHoverFlow,
}: {
  arc: FlowArcData;
  index: number;
  onHoverFlow: (flow: { sourceId: string; targetId: string } | null) => void;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const isHoveredRef = useRef(false);

  // Dash animation for the "particle travel" effect
  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const mat = lineRef.current.material as THREE.LineDashedMaterial;
    if (mat.isLineDashedMaterial) {
      // Animate dash offset to create a travelling pulse
      mat.dashSize = 0.04;
      mat.gapSize = 0.06;
      (mat as unknown as { dashOffset: number }).dashOffset =
        -(clock.elapsedTime * 0.15 + index * 0.3);
    }
  });

  const pointsArray = useMemo(
    () => arc.points.map((p) => [p.x, p.y, p.z] as [number, number, number]),
    [arc.points]
  );

  // Create a tube geometry along the arc path for hover detection
  const tubeGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(arc.points);
    return new THREE.TubeGeometry(curve, 60, 0.012, 6, false);
  }, [arc.points]);

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      isHoveredRef.current = true;
      document.body.style.cursor = 'pointer';
      onHoverFlow({
        sourceId: arc.flow.source_node_id,
        targetId: arc.flow.target_node_id,
      });
    },
    [arc.flow.source_node_id, arc.flow.target_node_id, onHoverFlow]
  );

  const handlePointerOut = useCallback(() => {
    isHoveredRef.current = false;
    document.body.style.cursor = 'auto';
    onHoverFlow(null);
  }, [onHoverFlow]);

  // Animate hover brightness
  useFrame(() => {
    if (!hoverMeshRef.current) return;
    const mat = hoverMeshRef.current.material as THREE.MeshBasicMaterial;
    const targetOpacity = isHoveredRef.current ? 0.15 : 0;
    mat.opacity += (targetOpacity - mat.opacity) * 0.2;
  });

  return (
    <group>
      {/* Invisible tube for hover detection + visible glow on hover */}
      <mesh
        ref={hoverMeshRef}
        geometry={tubeGeometry}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshBasicMaterial
          color={arc.color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Base arc line (subtle, full opacity background) */}
      <Line
        points={pointsArray}
        color={arc.color}
        lineWidth={arc.width * 0.5}
        opacity={arc.opacity * 0.2}
        transparent
      />

      {/* Animated dashed line (travelling particles) */}
      <AnimatedDashLine
        points={arc.points}
        color={arc.color}
        opacity={arc.opacity}
        index={index}
      />

      {/* Particle head that travels along the arc */}
      <TravellingParticle
        points={arc.points}
        color={arc.color}
        index={index}
      />
    </group>
  );
}

// ─── Animated Dashed Line ─────────────────────────────────────────────
function AnimatedDashLine({
  points,
  color,
  opacity,
  index,
}: {
  points: THREE.Vector3[];
  color: string;
  opacity: number;
  width?: number;
  index: number;
}) {
  const lineRef = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    geo.computeBoundingSphere();
    return geo;
  }, [points]);

  const material = useMemo(() => {
    const mat = new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity: opacity * 0.7,
      dashSize: 0.04,
      gapSize: 0.06,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return mat;
  }, [color, opacity]);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    // Update dash offset for animation
    const mat = lineRef.current.material as THREE.LineDashedMaterial;
    (mat as unknown as Record<string, number>).dashOffset =
      -(clock.elapsedTime * 0.2 + index * 0.5);
    lineRef.current.computeLineDistances();
  });

  return <primitive ref={lineRef} object={new THREE.Line(geometry, material)} />;
}

// ─── Travelling Particle ──────────────────────────────────────────────
function TravellingParticle({
  points,
  color,
  index,
}: {
  points: THREE.Vector3[];
  color: string;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || points.length < 2) return;

    // Particle travels the arc path over time
    const speed = 0.15;
    const t = ((clock.elapsedTime * speed + index * 0.3) % 1.0 + 1.0) % 1.0;
    const segIndex = Math.floor(t * (points.length - 1));
    const segT = t * (points.length - 1) - segIndex;
    const p0 = points[Math.min(segIndex, points.length - 1)];
    const p1 = points[Math.min(segIndex + 1, points.length - 1)];

    meshRef.current.position.lerpVectors(p0, p1, segT);

    // Pulse the particle size
    const pulse = 1.0 + Math.sin(clock.elapsedTime * 6 + index) * 0.3;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.006, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
