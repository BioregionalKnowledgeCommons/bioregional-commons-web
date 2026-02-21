'use client';

import { useMemo, useCallback, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { useGlobeStore } from '@/stores/globeStore';
import { latLngToVector3 } from '@/lib/geo-utils';

const ALTITUDE = 0.003;
const DOT_SIZE = 0.012;
const CYAN = new THREE.Color('#06b6d4');
const FILL_COLOR = new THREE.Color('#06b6d4');
// const GRID_COLOR = new THREE.Color('#06b6d4');
const CROSSHAIR_COLOR = new THREE.Color('#f97316');

/**
 * Converts a [lng, lat] pair to a Vector3 on the globe sphere.
 */
function toVec(lngLat: [number, number], alt: number = ALTITUDE): THREE.Vector3 {
  return latLngToVector3(lngLat[1], lngLat[0], 1.0, alt);
}

/**
 * Calculate polygon area in km² using spherical excess formula
 */
function calculateAreaKm2(boundary: [number, number][]): number {
  if (boundary.length < 3) return 0;

  const toRad = (d: number) => (d * Math.PI) / 180;
  let total = 0;

  for (let i = 0; i < boundary.length; i++) {
    const j = (i + 1) % boundary.length;
    const [lng1, lat1] = boundary[i];
    const [lng2, lat2] = boundary[j];
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }

  const earthRadius = 6371; // km
  return Math.abs((total * earthRadius * earthRadius) / 2);
}

/**
 * Format area for display
 */
function formatArea(km2: number): string {
  if (km2 < 1) {
    return `${(km2 * 1000000).toFixed(0)} m²`;
  }
  if (km2 < 100) {
    return `${km2.toFixed(2)} km²`;
  }
  return `${km2.toFixed(0)} km²`;
}

/**
 * TerritoryDrawer renders:
 * 1. An invisible click-interceptor sphere (when drawing mode is on)
 * 2. Cyan dot markers at each boundary point
 * 3. Lines connecting the dots
 * 4. A translucent fill polygon when 3+ points exist
 * 5. Crosshair cursor showing current position
 * 6. Lat/lng grid lines for precision
 * 7. Area measurement display
 */
export default function TerritoryDrawer() {
  const isDrawing = useGlobeStore((s) => s.isDrawingBoundary);
  const boundary = useGlobeStore((s) => s.onboardingBoundary);
  const addPoint = useGlobeStore((s) => s.addBoundaryPoint);
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);

  // Cursor position state
  const [cursorPos, setCursorPos] = useState<THREE.Vector3 | null>(null);
  const [cursorLatLng, setCursorLatLng] = useState<[number, number] | null>(null);

  // Handle mouse move to show crosshair cursor
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDrawing) return;

      const point = e.point.clone().normalize();
      const lat = 90 - Math.acos(point.y) * (180 / Math.PI);
      let lng = Math.atan2(point.z, -point.x) * (180 / Math.PI) - 180;
      if (lng < -180) lng += 360;
      if (lng > 180) lng -= 360;

      setCursorPos(point.multiplyScalar(1.005));
      setCursorLatLng([lng, lat]);
    },
    [isDrawing],
  );

  // Handle click on the invisible sphere to add a boundary point
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isDrawing) return;
      e.stopPropagation();

      // Convert the hit point on the unit sphere to lat/lng
      const point = e.point.clone().normalize();
      const lat = 90 - Math.acos(point.y) * (180 / Math.PI);
      let lng = Math.atan2(point.z, -point.x) * (180 / Math.PI) - 180;
      // Normalize to [-180, 180]
      if (lng < -180) lng += 360;
      if (lng > 180) lng -= 360;

      addPoint([lng, lat]);
    },
    [isDrawing, addPoint],
  );

  // Calculate area
  const area = useMemo(() => calculateAreaKm2(boundary), [boundary]);

  // Boundary point positions
  const dotPositions = useMemo(
    () => boundary.map((pt) => toVec(pt, ALTITUDE + 0.002)),
    [boundary],
  );

  // Line geometry connecting the dots
  const lineGeometry = useMemo(() => {
    if (boundary.length < 2) return null;
    const points = boundary.map((pt) => toVec(pt, ALTITUDE + 0.001));
    // Close the loop if 3+
    if (boundary.length >= 3) points.push(points[0]);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [boundary]);

  // Fill polygon geometry (simple triangle fan from centroid)
  const fillGeometry = useMemo(() => {
    if (boundary.length < 3) return null;

    // Compute centroid
    const centroid: [number, number] = [0, 0];
    boundary.forEach(([lng, lat]) => {
      centroid[0] += lng / boundary.length;
      centroid[1] += lat / boundary.length;
    });

    const centerVec = toVec(centroid, ALTITUDE);
    const pts = boundary.map((pt) => toVec(pt, ALTITUDE));

    // Triangle fan: center -> pt[i] -> pt[i+1]
    const positions: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      positions.push(
        centerVec.x, centerVec.y, centerVec.z,
        pts[i].x, pts[i].y, pts[i].z,
        next.x, next.y, next.z,
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [boundary]);

  // Crosshair lines at cursor position
  const crosshairLines = useMemo(() => {
    if (!cursorPos || !isDrawing) return null;

    const pos = cursorPos;
    const size = 0.015 + (1.5 - Math.min(zoomDistance, 1.5)) * 0.01; // Smaller at close zoom

    // Create crosshair perpendicular to globe surface
    const up = pos.clone().normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(up).normalize();
    if (right.length() < 0.1) {
      right.set(1, 0, 0).cross(up).normalize();
    }
    const forward = up.clone().cross(right).normalize();

    return {
      horizontal: [
        [pos.x - right.x * size, pos.y - right.y * size, pos.z - right.z * size] as [number, number, number],
        [pos.x + right.x * size, pos.y + right.y * size, pos.z + right.z * size] as [number, number, number],
      ],
      vertical: [
        [pos.x - forward.x * size, pos.y - forward.y * size, pos.z - forward.z * size] as [number, number, number],
        [pos.x + forward.x * size, pos.y + forward.y * size, pos.z + forward.z * size] as [number, number, number],
      ],
    };
  }, [cursorPos, isDrawing, zoomDistance]);

  // Preview line from last point to cursor
  const previewLine = useMemo(() => {
    if (!cursorLatLng || boundary.length === 0 || !isDrawing) return null;

    const lastPoint = boundary[boundary.length - 1];
    return [
      toVec(lastPoint, ALTITUDE + 0.001),
      toVec(cursorLatLng, ALTITUDE + 0.001),
    ].map((v) => [v.x, v.y, v.z] as [number, number, number]);
  }, [cursorLatLng, boundary, isDrawing]);

  return (
    <group>
      {/* Invisible click interceptor sphere — only active when drawing */}
      {isDrawing && (
        <mesh onClick={handleClick} onPointerMove={handlePointerMove}>
          <sphereGeometry args={[1.01, 128, 128]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* Crosshair cursor */}
      {crosshairLines && (
        <group>
          <Line
            points={crosshairLines.horizontal}
            color={CROSSHAIR_COLOR}
            lineWidth={2}
          />
          <Line
            points={crosshairLines.vertical}
            color={CROSSHAIR_COLOR}
            lineWidth={2}
          />
          {/* Cursor center dot */}
          {cursorPos && (
            <mesh position={cursorPos}>
              <sphereGeometry args={[0.004, 8, 8]} />
              <meshBasicMaterial color={CROSSHAIR_COLOR} />
            </mesh>
          )}
        </group>
      )}

      {/* Coordinate display at cursor */}
      {cursorLatLng && isDrawing && cursorPos && (
        <Html
          position={[cursorPos.x, cursorPos.y + 0.04, cursorPos.z]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-orange-400 whitespace-nowrap border border-orange-500/30">
            {cursorLatLng[1].toFixed(4)}°, {cursorLatLng[0].toFixed(4)}°
          </div>
        </Html>
      )}

      {/* Preview line from last point to cursor */}
      {previewLine && (
        <Line
          points={previewLine}
          color={CYAN}
          lineWidth={1}
          transparent
          opacity={0.5}
          dashed
          dashSize={0.01}
          gapSize={0.005}
        />
      )}

      {/* Boundary point markers */}
      {dotPositions.map((pos, i) => (
        <mesh key={`dot-${i}`} position={pos}>
          <sphereGeometry args={[DOT_SIZE, 16, 16]} />
          <meshBasicMaterial color={CYAN} />
        </mesh>
      ))}

      {/* First point slightly larger — indicates start */}
      {dotPositions.length > 0 && (
        <mesh position={dotPositions[0]}>
          <sphereGeometry args={[DOT_SIZE * 1.5, 16, 16]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Connecting lines */}
      {lineGeometry && (
        <lineLoop geometry={lineGeometry}>
          <lineBasicMaterial color={CYAN} linewidth={2} transparent opacity={0.8} />
        </lineLoop>
      )}

      {/* Fill polygon */}
      {fillGeometry && (
        <mesh geometry={fillGeometry}>
          <meshBasicMaterial
            color={FILL_COLOR}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Area measurement display */}
      {boundary.length >= 3 && (
        <Html
          position={toVec(
            [
              boundary.reduce((sum, p) => sum + p[0], 0) / boundary.length,
              boundary.reduce((sum, p) => sum + p[1], 0) / boundary.length,
            ],
            ALTITUDE + 0.02
          )}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-gray-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-cyan-500/30 shadow-lg">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Area</div>
            <div className="text-sm font-semibold text-cyan-400">{formatArea(area)}</div>
            <div className="text-[9px] text-gray-500">{boundary.length} points</div>
          </div>
        </Html>
      )}
    </group>
  );
}
