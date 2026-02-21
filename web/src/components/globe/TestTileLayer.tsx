'use client';

import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useGlobeStore } from '@/stores/globeStore';

/**
 * Minimal test tile layer to debug projection issues.
 * Loads a single tile covering a known area and renders it.
 */

// Simple lat/lng to 3D - matches Three.js SphereGeometry convention
function latLngTo3D(lat: number, lng: number, radius: number = 1.01): THREE.Vector3 {
  // Convert to radians
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;

  // Standard spherical coordinates matching Three.js SphereGeometry
  // At lng=0 (Prime Meridian), we should be at (radius, 0, 0) on equator
  // At lng=-90, we should be at (0, 0, radius)
  // At lng=90, we should be at (0, 0, -radius)
  // At lng=180/-180, we should be at (-radius, 0, 0)
  const x = radius * Math.cos(latRad) * Math.cos(lngRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lngRad);

  return new THREE.Vector3(x, y, z);
}

// Create a curved tile geometry
function createTileGeometry(
  north: number, south: number, west: number, east: number,
  segments: number = 16
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segments; j++) {
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const v = j / segments;

      // Geographic position
      const lat = north - (north - south) * v;  // north at v=0, south at v=1
      const lng = west + (east - west) * u;     // west at u=0, east at u=1

      const pos = latLngTo3D(lat, lng);
      positions.push(pos.x, pos.y, pos.z);

      // UV: u=0 should be west (left of tile image), v=0 should be north (top of tile image)
      // WebGL has (0,0) at bottom-left, so we flip v
      uvs.push(u, 1 - v);
    }
  }

  // Create triangles
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;

      // Two triangles per quad, counter-clockwise winding when viewed from outside
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export default function TestTileLayer() {
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load a test tile - tile 2/1/1 covers lng -90 to 0, lat 0-66
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    // Tile 2/1/1: covers approximately lng -90° to 0°, lat ~0° to ~66°
    const url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/2/1/1';

    console.log('[TestTileLayer] Loading texture from:', url);

    loader.load(
      url,
      (tex) => {
        console.log('[TestTileLayer] Texture loaded successfully!');
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        setTexture(tex);
      },
      undefined,
      (err) => {
        console.error('[TestTileLayer] Failed to load texture:', err);
      }
    );
  }, []);

  // Calculate the bounds of tile 2/1/1
  // At zoom 2, there are 4 tiles in each direction (2^2)
  // x=1 means: west = (1/4)*360 - 180 = -90°, east = (2/4)*360 - 180 = 0°
  // y=1 means: need Mercator inverse
  const bounds = useMemo(() => {
    const z = 2;
    const x = 1;
    const y = 1;
    const n = Math.pow(2, z);

    const west = (x / n) * 360 - 180;
    const east = ((x + 1) / n) * 360 - 180;
    const north = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180 / Math.PI;
    const south = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180 / Math.PI;

    console.log('[TestTile] Bounds:', { north, south, west, east });
    return { north, south, west, east };
  }, []);

  const geometry = useMemo(() => {
    return createTileGeometry(bounds.north, bounds.south, bounds.west, bounds.east);
  }, [bounds]);

  // Debug: log zoom distance
  console.log('[TestTileLayer] zoomDistance:', zoomDistance.toFixed(2), 'texture loaded:', !!texture);

  // Debug markers at the corners (always visible)
  const nwPos = latLngTo3D(bounds.north, bounds.west);
  const nePos = latLngTo3D(bounds.north, bounds.east);
  const swPos = latLngTo3D(bounds.south, bounds.west);
  const sePos = latLngTo3D(bounds.south, bounds.east);

  // Show markers always, tile only when zoomed in
  // const showTile = zoomDistance < 2.5;

  return (
    <group>
      {/* Corner markers - always visible */}
      <mesh position={[nwPos.x, nwPos.y, nwPos.z]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
      <mesh position={[nePos.x, nePos.y, nePos.z]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="green" />
      </mesh>
      <mesh position={[swPos.x, swPos.y, swPos.z]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      <mesh position={[sePos.x, sePos.y, sePos.z]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {/* The tile - always show for debugging */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          map={texture}
          color={texture ? undefined : "magenta"}
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}
