'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Roadmap, LayoutNode, LaneId } from './roadmap-types';
import { LANE_CONFIGS, HORIZONS } from './roadmap-types';
import { computeLayout, COL_WIDTH, LABEL_WIDTH, COL_HEADER_HEIGHT, SVG_PAD } from './roadmap-layout';
import { RoadmapNodeComponent } from './RoadmapNode';
import { RoadmapEdgeComponent, EdgeMarkerDefs } from './RoadmapEdge';
import { DetailPanel } from './DetailPanel';
import { RoadmapFilters, defaultFilters, type FilterState } from './RoadmapFilters';
import { RoadmapLegend } from './RoadmapLegend';

interface Props {
  roadmap: Roadmap;
}

export function RoadmapViz({ roadmap: initialRoadmap }: Props) {
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showLegend, setShowLegend] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // ── Layout ──────────────────────────────────────────────────────────────────
  const layout = useMemo(() => computeLayout(roadmap), [roadmap]);

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  );

  // ── Filtering ───────────────────────────────────────────────────────────────
  const visibleNodes = useMemo(
    () =>
      layout.nodes.filter(
        (n) =>
          filters.horizons.has(n.horizon) &&
          filters.statuses.has(n.status) &&
          filters.priorities.has(n.priority) &&
          filters.lanes.has(n.lane) &&
          filters.kinds.has(n.kind),
      ),
    [layout.nodes, filters],
  );

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () =>
      layout.edges.filter(
        (e) =>
          visibleNodeIds.has(e.from) &&
          visibleNodeIds.has(e.to) &&
          filters.edgeTypes.has(e.type as typeof filters.edgeTypes extends Set<infer T> ? T : never),
      ),
    [layout.edges, visibleNodeIds, filters.edgeTypes],
  );

  // Connected node ids for highlighting
  const connectedIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    for (const e of layout.edges) {
      if (e.from === selectedNode.id) ids.add(e.to);
      if (e.to === selectedNode.id) ids.add(e.from);
    }
    return ids;
  }, [selectedNode, layout.edges]);

  // ── Pan interaction ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('[data-interactive]')) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/commons/api/roadmap');
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
        setSelectedNode(null);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const { totalWidth, totalHeight, laneY, laneHeight, headerRowHeight } = layout;

  // ── SVG Grid ──────────────────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const lines = [];
    for (let c = 0; c <= HORIZONS.length; c++) {
      const x = SVG_PAD + LABEL_WIDTH + c * COL_WIDTH;
      lines.push(<line key={`col-${c}`} x1={x} y1={0} x2={x} y2={totalHeight} stroke="#1e293b" strokeWidth={1} />);
    }
    return lines;
  }, [totalWidth, totalHeight]);

  const laneIds = ['header', 'demo', 'kg', 'security', 'capital', 'footer'] as LaneId[];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Header bar ── */}
      <div className="border-b border-gray-800/50 bg-gray-900/60 backdrop-blur-xl sticky top-0 z-20 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors text-xs">
            ← Globe
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-white">{roadmap.program}</h1>
            <div className="text-[10px] text-gray-500 font-mono">
              v{roadmap.version} · {roadmap.as_of} · {visibleNodes.length}/{layout.nodes.length} nodes visible
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowLegend((v) => !v)}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              {showLegend ? 'Hide Legend' : 'Legend'}
            </button>
            <button
              onClick={() => setPan({ x: 0, y: 0 })}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Reset Pan
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <RoadmapFilters filters={filters} onChange={setFilters} />

      {/* ── Legend (collapsible) ── */}
      {showLegend && (
        <div className="px-6 py-3 border-b border-gray-800/30">
          <RoadmapLegend />
        </div>
      )}

      {/* ── SVG Canvas ── */}
      <div
        className="flex-1 overflow-auto"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0',
            display: 'inline-block',
          }}
        >
          <svg
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            style={{ display: 'block' }}
          >
            <EdgeMarkerDefs />

            {/* ── Column header ── */}
            <rect x={0} y={0} width={totalWidth} height={headerRowHeight} fill="#0a0f1a" />
            <rect x={SVG_PAD} y={8} width={LABEL_WIDTH - 8} height={headerRowHeight - 16} rx={4} fill="#0f172a" />
            <text x={SVG_PAD + 8} y={headerRowHeight / 2 + 4} fontSize={10} fill="#475569" fontFamily="monospace">
              lane / horizon
            </text>
            {HORIZONS.map((h, i) => {
              const cx = SVG_PAD + LABEL_WIDTH + i * COL_WIDTH + COL_WIDTH / 2;
              return (
                <text key={h} x={cx} y={headerRowHeight / 2 + 4} fontSize={11} fontWeight={600} fill="#64748b" textAnchor="middle" fontFamily="monospace">
                  {h}
                </text>
              );
            })}

            {/* ── Vertical grid lines ── */}
            {gridLines}

            {/* ── Lane backgrounds + labels ── */}
            {laneIds.map((laneId) => {
              const cfg = LANE_CONFIGS.find((l) => l.id === laneId)!;
              const ly = laneY[laneId];
              const lh = laneHeight[laneId];
              if (!ly && ly !== 0) return null;
              return (
                <g key={laneId}>
                  {/* Full-width tinted background */}
                  <rect x={0} y={ly} width={totalWidth} height={lh} fill={cfg.bg} />
                  {/* Lane separator */}
                  <line x1={0} y1={ly} x2={totalWidth} y2={ly} stroke="#1e293b" strokeWidth={1} />
                  {/* Accent side bar */}
                  <rect x={0} y={ly} width={3} height={lh} fill={cfg.accent} opacity={0.6} />
                  {/* Label */}
                  <g transform={`translate(${SVG_PAD + 8}, ${ly + lh / 2})`}>
                    <text
                      transform="rotate(-90)"
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={600}
                      fill={cfg.accent}
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                      letterSpacing={1}
                    >
                      {cfg.label.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* ── Edges (below nodes) ── */}
            <g>
              {visibleEdges.map((edge, i) => {
                const isHighlighted =
                  !selectedNode ||
                  edge.from === selectedNode.id ||
                  edge.to === selectedNode.id;
                return (
                  <RoadmapEdgeComponent
                    key={i}
                    edge={edge}
                    nodeMap={nodeMap}
                    isVisible={true}
                    isHighlighted={isHighlighted}
                  />
                );
              })}
            </g>

            {/* ── Nodes ── */}
            <g data-interactive>
              {visibleNodes.map((node) => (
                <RoadmapNodeComponent
                  key={node.id}
                  node={node}
                  isSelected={selectedNode?.id === node.id}
                  isHighlighted={connectedIds.has(node.id)}
                  onClick={(n) => setSelectedNode((prev) => (prev?.id === n.id ? null : n))}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* ── Detail panel ── */}
      <DetailPanel
        node={selectedNode}
        edges={layout.edges}
        nodeMap={nodeMap}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
