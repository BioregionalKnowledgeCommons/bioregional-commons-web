// ============================================================
// Globe & Camera Constants
// ============================================================

/** Radius of the 3D globe mesh */
export const GLOBE_RADIUS = 1.0;

/** Default camera distance from globe center */
export const CAMERA_DEFAULT_DISTANCE = 2.8;

/** Camera distance when zoomed into a bioregion or node */
export const CAMERA_ZOOM_DISTANCE = 2.0;

/** Duration (seconds) for camera fly-to animations */
export const ANIMATION_DURATION = 1.8;

// ============================================================
// Base Path (for GitHub Pages deployment)
// ============================================================

/**
 * Returns the Next.js basePath at runtime.
 * In production on GitHub Pages this will be '/bioregionalknowledgecommons',
 * in local dev it will be ''.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Prefix a public asset path with the basePath.
 * Usage: assetPath('/data/foo.json') → '/commons/data/foo.json' (prod)
 *                                    → '/data/foo.json' (dev)
 */
export function assetPath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * Prefix an API route path with the basePath.
 * Usage: apiPath('/api/nodes') → '/commons/api/nodes' (prod)
 *                               → '/api/nodes' (dev)
 */
export function apiPath(path: string): string {
  return `${BASE_PATH}${path}`;
}

// ============================================================
// Data URLs (served from /public)
// ============================================================

/** Simplified bioregion GeoJSON for globe rendering */
export const BIOREGION_DATA_URL = '/data/bioregions-simplified.json';

/** Bioregion code → metadata lookup table */
export const BIOREGION_LOOKUP_URL = '/data/bioregion-lookup.json';
