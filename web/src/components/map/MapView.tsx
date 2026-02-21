'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useGlobeStore } from '@/stores/globeStore';
import { seedNodes, getNodePosition } from '@/data/seed-registry';
import { DOMAIN_COLORS } from '@/types';
import type { ThematicDomain, NodeEntry } from '@/types';

// ============================================================
// Dark-map CSS filter (applied to the canvas only, not markers)
// ============================================================

const DARK_MAP_STYLE_ID = 'mapview-dark-canvas-style';

function injectDarkMapCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(DARK_MAP_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = DARK_MAP_STYLE_ID;
  style.textContent = `
    .dark-map .maplibregl-canvas {
      filter: invert(1) hue-rotate(180deg) saturate(0.3) brightness(0.8);
    }
    .dark-map .maplibregl-ctrl-attrib {
      background: rgba(15, 15, 20, 0.7) !important;
      color: #888 !important;
      font-size: 10px !important;
    }
    .dark-map .maplibregl-ctrl-attrib a {
      color: #aaa !important;
    }
    .dark-map .maplibregl-ctrl-group {
      background: rgba(30, 30, 40, 0.9) !important;
      border: 1px solid rgba(100, 100, 120, 0.3) !important;
    }
    .dark-map .maplibregl-ctrl-group button {
      filter: invert(0.8);
    }
    .dark-map .maplibregl-ctrl-group button + button {
      border-top: 1px solid rgba(100, 100, 120, 0.3) !important;
    }
    /* Popup styling */
    .dark-map-popup .maplibregl-popup-content {
      background: rgba(20, 20, 30, 0.95);
      border: 1px solid rgba(100, 100, 140, 0.3);
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      color: #e0e0e0;
      font-size: 12px;
      max-width: 220px;
    }
    .dark-map-popup .maplibregl-popup-tip {
      border-top-color: rgba(20, 20, 30, 0.95);
    }
    .dark-map-popup .maplibregl-popup-close-button {
      color: #888;
      font-size: 14px;
    }
    .dark-map-popup .maplibregl-popup-close-button:hover {
      color: #fff;
      background: transparent;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================
// Helpers
// ============================================================

function formatDomain(domain: ThematicDomain): string {
  return domain
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============================================================
// MapView Component
// ============================================================

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Store hooks
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const cameraTarget = useGlobeStore((s) => s.cameraTarget);

  // ── Build marker element ──────────────────────────────────
  const createMarkerElement = useCallback(
    (node: NodeEntry) => {
      const color = DOMAIN_COLORS[node.thematic_domain] || DOMAIN_COLORS.other;

      // Outer wrapper for hover scaling
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        cursor: pointer;
        transition: transform 0.15s ease;
      `;

      // Dot element
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 6px ${color}88, 0 2px 8px rgba(0,0,0,0.4);
      `;
      wrapper.appendChild(dot);

      // Hover
      wrapper.addEventListener('mouseenter', () => {
        wrapper.style.transform = 'scale(1.3)';
      });
      wrapper.addEventListener('mouseleave', () => {
        wrapper.style.transform = 'scale(1)';
      });

      // Click
      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedNode(node.node_id);
      });

      return wrapper;
    },
    [setSelectedNode],
  );

  // ── Initialize map ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    injectDarkMapCSS();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [0, 20],
      zoom: 2,
      attributionControl: false,
    });

    // Navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    mapRef.current = map;

    // ── Add markers once map loads ──────────────────────────
    map.on('load', () => {
      seedNodes.forEach((node) => {
        const pos = getNodePosition(node);
        if (!pos) return;

        const el = createMarkerElement(node);

        // Tooltip popup
        const popup = new maplibregl.Popup({
          offset: 12,
          closeButton: false,
          closeOnClick: false,
          className: 'dark-map-popup',
        }).setHTML(
          `<div style="font-weight:600;margin-bottom:2px;">${node.display_name}</div>` +
            `<div style="color:${DOMAIN_COLORS[node.thematic_domain]};font-size:11px;">${formatDomain(node.thematic_domain)}</div>`,
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(pos)
          .setPopup(popup)
          .addTo(map);

        // Show popup on hover
        el.addEventListener('mouseenter', () => marker.togglePopup());
        el.addEventListener('mouseleave', () => {
          if (marker.getPopup().isOpen()) marker.togglePopup();
        });

        markersRef.current.push(marker);
      });
    });

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fly to camera target from store ───────────────────────
  useEffect(() => {
    if (!cameraTarget || !mapRef.current) return;

    mapRef.current.flyTo({
      center: [cameraTarget.lng, cameraTarget.lat],
      zoom: Math.min(cameraTarget.zoom * 2.5, 14), // globe→map zoom conversion
      duration: 1500,
    });
  }, [cameraTarget]);

  return (
    <div
      ref={containerRef}
      className="dark-map absolute inset-0 w-full h-full"
    />
  );
}
