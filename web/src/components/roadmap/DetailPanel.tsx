'use client';

import { useEffect } from 'react';
import type { LayoutNode, RoadmapEdge } from './roadmap-types';
import { LANE_CONFIG_MAP, STATUS_COLORS, PRIORITY_COLORS, EDGE_STYLES } from './roadmap-types';

interface Props {
  node: LayoutNode | null;
  edges: RoadmapEdge[];
  nodeMap: Map<string, LayoutNode>;
  onClose: () => void;
  onSelectNode: (n: LayoutNode) => void;
}

export function DetailPanel({ node, edges, nodeMap, onClose, onSelectNode }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!node) return null;

  const laneConfig = LANE_CONFIG_MAP[node.lane];
  const statusColor = STATUS_COLORS[node.status];
  const priorityColor = PRIORITY_COLORS[node.priority] ?? '#6b7280';

  const inEdges = edges.filter((e) => e.to === node.id);
  const outEdges = edges.filter((e) => e.from === node.id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[360px] bg-gray-900 border-l border-gray-700/60 z-40 overflow-y-auto shadow-2xl"
        style={{ borderLeftColor: `${laneConfig.accent}40` }}
      >
        {/* Header */}
        <div
          className="p-5 border-b border-gray-700/40"
          style={{ borderBottomColor: `${laneConfig.accent}30` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: laneConfig.accent,
                    backgroundColor: `${laneConfig.accent}15`,
                    border: `1px solid ${laneConfig.accent}30`,
                  }}
                >
                  {node.kind.replace('_', ' ')}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ color: priorityColor, backgroundColor: `${priorityColor}15`, border: `1px solid ${priorityColor}30` }}
                >
                  {node.priority}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ color: statusColor, backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}30` }}
                >
                  {node.status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white leading-snug">{node.title}</h2>
              <div className="text-[10px] text-gray-500 mt-1 font-mono">{node.id}</div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors mt-0.5 flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Summary */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Summary</div>
            <p className="text-sm text-gray-300 leading-relaxed">{node.summary}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <Meta label="Horizon" value={node.horizon} />
            <Meta label="Lane" value={laneConfig.label} color={laneConfig.accent} />
            {node.due_date && <Meta label="Due" value={node.due_date} />}
            {node.owner && <Meta label="Owner" value={node.owner.replace('owner.', '')} />}
          </div>

          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {node.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metric metadata */}
          {node.metadata && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Target</div>
              <div className="text-sm font-mono text-gray-300">
                {String(node.metadata.target ?? '')}
                <span className="text-gray-600 ml-2">({String(node.metadata.type ?? '')})</span>
              </div>
            </div>
          )}

          {/* Outgoing edges */}
          {outEdges.length > 0 && (
            <EdgeList title="Outgoing" edges={outEdges} nodeMap={nodeMap} direction="to" onSelectNode={onSelectNode} />
          )}

          {/* Incoming edges */}
          {inEdges.length > 0 && (
            <EdgeList title="Incoming" edges={inEdges} nodeMap={nodeMap} direction="from" onSelectNode={onSelectNode} />
          )}

          {/* Source docs */}
          {node.source_docs && node.source_docs.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Source Docs</div>
              <div className="space-y-1">
                {node.source_docs.map((doc) => (
                  <div key={doc} className="text-[10px] font-mono text-gray-500 break-all">{doc}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Meta({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-600">{label}</div>
      <div className="text-xs mt-0.5 font-medium" style={{ color: color ?? '#cbd5e1' }}>
        {value}
      </div>
    </div>
  );
}

function EdgeList({
  title,
  edges,
  nodeMap,
  direction,
  onSelectNode,
}: {
  title: string;
  edges: RoadmapEdge[];
  nodeMap: Map<string, LayoutNode>;
  direction: 'from' | 'to';
  onSelectNode: (n: LayoutNode) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{title}</div>
      <div className="space-y-1.5">
        {edges.map((e, i) => {
          const peerId = direction === 'to' ? e.to : e.from;
          const peer = nodeMap.get(peerId);
          const style = EDGE_STYLES[e.type];
          return (
            <div key={i} className="flex items-start gap-2">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5"
                style={{ color: style.color, backgroundColor: `${style.color}15`, border: `1px solid ${style.color}25` }}
              >
                {style.label}
              </span>
              {peer ? (
                <button
                  className="text-[11px] text-blue-400 hover:text-blue-300 leading-tight text-left underline underline-offset-2 transition-colors"
                  onClick={() => onSelectNode(peer)}
                >
                  {peer.title}
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 leading-tight">{peerId}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
