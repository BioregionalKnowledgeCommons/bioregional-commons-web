'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGlobeStore } from '@/stores/globeStore';

// ─── Tile Configuration ────────────────────────────────────────────────
// NASA GIBS provides free, high-quality satellite imagery tiles
// https://nasa-gibs.github.io/gibs-api-docs/

const TILE_CONFIG = {
  // Zoom threshold: show tiles when camera is closer than this distance
  enableThreshold: 1.5,
  // Maximum zoom level for tile fetching (higher = more detail)
  maxZoom: 8,
  // Minimum zoom level to start showing tiles
  minZoom: 3,
  // Tile providers (ordered by preference)
  providers: {
    // NASA GIBS - Free, public domain, daily imagery
    nasa: {
      name: 'NASA GIBS',
      urlTemplate: (z: number, x: number, y: number, date: string) =>
        `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/250m/${z}/${y}/${x}.jpg`,
      maxZoom: 8,
      attribution: 'NASA GIBS',
    },
    // Mapbox Satellite - Higher quality, requires token
    mapbox: {
      name: 'Mapbox Satellite',
      urlTemplate: (z: number, x: number, y: number) =>
        `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.jpg90?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
      maxZoom: 19,
      attribution: 'Mapbox',
    },
    // OpenStreetMap Carto - Free, no auth required
    osm: {
      name: 'OpenStreetMap',
      urlTemplate: (z: number, x: number, y: number) =>
        `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
      maxZoom: 19,
      attribution: 'OpenStreetMap',
    },
  },
};

// Get date string for NASA GIBS (yesterday to ensure data availability)
function getGibsDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

// Convert lat/lng to tile coordinates at a given zoom level
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

// Convert camera distance to approximate zoom level
function distanceToZoom(distance: number): number {
  // Map distance 1.005-1.5 to zoom levels 8-3
  if (distance >= 1.5) return 3;
  if (distance <= 1.02) return 8;
  const t = (1.5 - distance) / (1.5 - 1.02);
  return Math.round(3 + t * 5);
}

// Convert tile coordinates to lat/lng bounds
function tileBounds(x: number, y: number, zoom: number): {
  north: number;
  south: number;
  west: number;
  east: number;
} {
  const n = Math.pow(2, zoom);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const north = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const south = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return { north, south, west, east };
}

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Tile Cache ────────────────────────────────────────────────────────
interface TileData {
  key: string;
  texture: THREE.Texture | null;
  loading: boolean;
  error: boolean;
  bounds: { north: number; south: number; west: number; east: number };
  zoom: number;
  geometry: THREE.BufferGeometry | null;
}

const tileCache = new Map<string, TileData>();
const textureLoader = new THREE.TextureLoader();

function getTileKey(z: number, x: number, y: number): string {
  return `${z}/${x}/${y}`;
}

// ─── Individual Tile Component ─────────────────────────────────────────
function Tile({ tileData }: { tileData: TileData }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create curved geometry for the tile
  const geometry = useMemo(() => {
    if (tileData.geometry) return tileData.geometry;

    const { north, south, west, east } = tileData.bounds;
    const segments = 16; // Segments per side for smooth curvature
    const radius = 1.001; // Slightly above globe surface

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Generate vertices
    for (let j = 0; j <= segments; j++) {
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const v = j / segments;
        const lat = north + (south - north) * v;
        const lng = west + (east - west) * u;

        const pos = latLngToVector3(lat, lng, radius);
        positions.push(pos.x, pos.y, pos.z);
        uvs.push(u, 1 - v);
      }
    }

    // Generate indices
    for (let j = 0; j < segments; j++) {
      for (let i = 0; i < segments; i++) {
        const a = j * (segments + 1) + i;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [tileData.bounds, tileData.geometry]);

  if (!tileData.texture || tileData.loading || tileData.error) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        map={tileData.texture}
        transparent
        opacity={0.95}
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Main High-Res Tile Layer ──────────────────────────────────────────
export default function HighResTileLayer() {
  const { camera } = useThree();
  const zoomDistance = useGlobeStore((s) => s.zoomDistance);
  const [visibleTiles, setVisibleTiles] = useState<TileData[]>([]);
  const lastUpdate = useRef(0);
  const gibsDate = useMemo(() => getGibsDate(), []);

  // Determine if we should show tiles
  const showTiles = zoomDistance < TILE_CONFIG.enableThreshold;

  // Load a tile texture
  const loadTile = (z: number, x: number, y: number): TileData => {
    const key = getTileKey(z, x, y);

    if (tileCache.has(key)) {
      return tileCache.get(key)!;
    }

    const bounds = tileBounds(x, y, z);
    const tileData: TileData = {
      key,
      texture: null,
      loading: true,
      error: false,
      bounds,
      zoom: z,
      geometry: null,
    };

    tileCache.set(key, tileData);

    // Use NASA GIBS as primary provider (free, no auth)
    const url = TILE_CONFIG.providers.nasa.urlTemplate(z, x, y, gibsDate);

    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        tileData.texture = texture;
        tileData.loading = false;
        // Force re-render
        setVisibleTiles((prev) => [...prev]);
      },
      undefined,
      () => {
        tileData.loading = false;
        tileData.error = true;
      }
    );

    return tileData;
  };

  // Update visible tiles based on camera position
  useFrame(() => {
    if (!showTiles) {
      if (visibleTiles.length > 0) {
        setVisibleTiles([]);
      }
      return;
    }

    // Throttle updates
    const now = Date.now();
    if (now - lastUpdate.current < 200) return;
    lastUpdate.current = now;

    // Get camera look direction to find center point
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.negate().normalize();

    // Calculate lat/lng of camera focus point
    const lat = Math.asin(direction.y) * (180 / Math.PI);
    const lng = Math.atan2(direction.z, -direction.x) * (180 / Math.PI) - 180;

    // Calculate zoom level based on distance
    const zoom = distanceToZoom(zoomDistance);

    // Get the center tile and surrounding tiles
    const centerTile = latLngToTile(lat, lng, zoom);
    const tiles: TileData[] = [];

    // Load a grid of tiles around the center (3x3 or 5x5 depending on zoom)
    const gridSize = zoom >= 6 ? 2 : 1;

    for (let dy = -gridSize; dy <= gridSize; dy++) {
      for (let dx = -gridSize; dx <= gridSize; dx++) {
        const n = Math.pow(2, zoom);
        const tx = ((centerTile.x + dx) % n + n) % n; // Wrap around
        const ty = Math.max(0, Math.min(n - 1, centerTile.y + dy));

        const tile = loadTile(zoom, tx, ty);
        tiles.push(tile);
      }
    }

    setVisibleTiles(tiles);
  });

  // Cleanup old textures when component unmounts
  useEffect(() => {
    return () => {
      tileCache.forEach((tile) => {
        if (tile.texture) {
          tile.texture.dispose();
        }
        if (tile.geometry) {
          tile.geometry.dispose();
        }
      });
      tileCache.clear();
    };
  }, []);

  if (!showTiles) {
    return null;
  }

  return (
    <group>
      {visibleTiles.map((tile) => (
        <Tile key={tile.key} tileData={tile} />
      ))}
    </group>
  );
}
