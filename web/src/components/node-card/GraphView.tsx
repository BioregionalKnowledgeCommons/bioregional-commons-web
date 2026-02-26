'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useSubgraph } from '@/hooks/useSubgraph';
import { useEntitySearch } from '@/hooks/useEntitySearch';

interface GraphViewProps {
  nodeId: string;
  nodeColor: string;
  seedUri: string | null;
  onSelectEntity: (uri: string) => void;
}

// Simple entity type → color mapping
const TYPE_COLORS: Record<string, string> = {
  Person: '#3b82f6',
  Organization: '#8b5cf6',
  Project: '#f59e0b',
  Location: '#10b981',
  Concept: '#06b6d4',
  Meeting: '#ec4899',
  Practice: '#14b8a6',
  Pattern: '#a855f7',
  Bioregion: '#22c55e',
  Protocol: '#6366f1',
};

interface SimNode {
  uri: string;
  label: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connectionCount: number;
}

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#6b7280';
}

export default function GraphView({ nodeId, seedUri, onSelectEntity }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSeedUri, setLocalSeedUri] = useState(seedUri);
  const dragRef = useRef<{ nodeIdx: number; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const { data: searchData } = useEntitySearch(nodeId, searchQuery);
  const { data: subgraph, isLoading } = useSubgraph(nodeId, localSeedUri);

  // When seedUri prop changes, update local
  useEffect(() => {
    if (seedUri) setLocalSeedUri(seedUri);
  }, [seedUri]);

  // Force simulation
  useEffect(() => {
    if (!subgraph || !canvasRef.current) return;

    const graph = subgraph; // capture for closures
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * 2; // retina
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Build connection count map
    const connectionCount = new Map<string, number>();
    for (const edge of graph.edges) {
      connectionCount.set(edge.source, (connectionCount.get(edge.source) ?? 0) + 1);
      connectionCount.set(edge.target, (connectionCount.get(edge.target) ?? 0) + 1);
    }

    // Initialize positions in a circle
    const simNodes: SimNode[] = graph.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / graph.nodes.length;
      const r = Math.min(width, height) * 0.3;
      return {
        ...n,
        x: width / 2 + r * Math.cos(angle),
        y: height / 2 + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        connectionCount: connectionCount.get(n.uri) ?? 0,
      };
    });
    nodesRef.current = simNodes;

    const nodeMap = new Map(simNodes.map((n, i) => [n.uri, i]));

    // Simple force simulation
    let iteration = 0;
    const maxIterations = 300;

    function simulate() {
      if (iteration > maxIterations) {
        draw();
        return;
      }
      iteration++;

      const alpha = Math.max(0.01, 1 - iteration / maxIterations);

      // Center force
      for (const node of simNodes) {
        node.vx += (width / 2 - node.x) * 0.01 * alpha;
        node.vy += (height / 2 - node.y) * 0.01 * alpha;
      }

      // Repulsion between all nodes
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const dx = simNodes[j].x - simNodes[i].x;
          const dy = simNodes[j].y - simNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (80 * alpha) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          simNodes[i].vx -= fx;
          simNodes[i].vy -= fy;
          simNodes[j].vx += fx;
          simNodes[j].vy += fy;
        }
      }

      // Spring force for edges
      for (const edge of graph.edges) {
        const si = nodeMap.get(edge.source);
        const ti = nodeMap.get(edge.target);
        if (si === undefined || ti === undefined) continue;
        const s = simNodes[si];
        const t = simNodes[ti];
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 80;
        const force = (dist - targetDist) * 0.05 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      // Apply velocities with damping
      for (const node of simNodes) {
        if (dragRef.current && simNodes[dragRef.current.nodeIdx] === node) continue;
        node.vx *= 0.6;
        node.vy *= 0.6;
        node.x += node.vx;
        node.y += node.vy;
        // Keep in bounds
        node.x = Math.max(30, Math.min(width - 30, node.x));
        node.y = Math.max(30, Math.min(height - 30, node.y));
      }

      draw();
      animRef.current = requestAnimationFrame(simulate);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.scale(scaleRef.current, scaleRef.current);

      // Draw edges
      for (const edge of graph.edges) {
        const si = nodeMap.get(edge.source);
        const ti = nodeMap.get(edge.target);
        if (si === undefined || ti === undefined) continue;
        const s = simNodes[si];
        const t = simNodes[ti];

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = 'rgba(107, 114, 128, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Predicate label at midpoint
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        ctx.font = '9px system-ui';
        ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(edge.predicate, mx, my - 3);
      }

      // Draw nodes
      for (const node of simNodes) {
        const radius = Math.max(5, Math.min(14, 5 + node.connectionCount * 2));
        const color = getTypeColor(node.type);

        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = color + '20';
        ctx.fill();

        // Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Highlight seed
        if (node.uri === localSeedUri) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Label
        ctx.font = '10px system-ui';
        ctx.fillStyle = '#e5e7eb';
        ctx.textAlign = 'center';
        const label = node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label;
        ctx.fillText(label, node.x, node.y + radius + 12);
      }

      ctx.restore();
    }

    simulate();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [subgraph, localSeedUri]);

  // Click handler for canvas nodes
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
      const y = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;

      for (const node of nodesRef.current) {
        const dx = x - node.x;
        const dy = y - node.y;
        const radius = Math.max(5, Math.min(14, 5 + node.connectionCount * 2));
        if (dx * dx + dy * dy < (radius + 5) * (radius + 5)) {
          setLocalSeedUri(node.uri);
          onSelectEntity(node.uri);
          return;
        }
      }
    },
    [onSelectEntity]
  );

  // Scroll to zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scaleRef.current = Math.max(0.3, Math.min(3, scaleRef.current * delta));
  }, []);

  return (
    <div className="space-y-3">
      {/* Search to pick seed entity */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for an entity to graph..."
          className="w-full bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
        {searchData?.results && searchData.results.length > 0 && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700/40 rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
            {searchData.results.slice(0, 6).map((r) => (
              <button
                key={r.uri}
                onClick={() => {
                  setLocalSeedUri(r.uri);
                  setSearchQuery('');
                  onSelectEntity(r.uri);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-gray-200">{r.label}</span>
                <span className="text-xs text-gray-500 ml-2">{r.entity_type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div
        className="relative rounded-lg border border-gray-700/30 overflow-hidden"
        style={{ height: 360, backgroundColor: '#0f1117' }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-gray-500">Loading graph...</div>
          </div>
        ) : !localSeedUri ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-gray-500 text-center px-4">
              Search for an entity above or select one from the Browser to visualize its knowledge graph
            </div>
          </div>
        ) : subgraph && subgraph.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-gray-500">No relationships found</div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onClick={handleCanvasClick}
            onWheel={handleWheel}
          />
        )}
      </div>

      {/* Legend */}
      {subgraph && subgraph.nodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_COLORS)
            .filter(([type]) => subgraph.nodes.some((n) => n.type === type))
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-gray-500">{type}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
