'use client';

import { useNodeStats } from '@/hooks/useNodeStats';
import type { KoiLiveNode } from '@/types';
import { NODE_COLORS } from '@/types';

interface OverviewTabProps {
  node: KoiLiveNode;
  nodeColor: string;
  childNodes: KoiLiveNode[];
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-200 font-mono truncate">{value}</div>
    </div>
  );
}

export default function OverviewTab({ node, nodeColor, childNodes }: OverviewTabProps) {
  const { data: statsData, isLoading: statsLoading } = useNodeStats(node.node_id);

  return (
    <div className="p-6 max-sm:p-4 space-y-6 pb-12">
      {/* Health Details */}
      {node.health && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Health</h3>
          <div className="grid grid-cols-2 gap-3">
            <InfoChip label="Mode" value={String(node.health.mode ?? '—')} />
            <InfoChip label="Database" value={String(node.health.database ?? '—')} />
            <InfoChip label="Embedding" value={String(node.health.embedding_model ?? 'none')} />
            <InfoChip label="Semantic" value={node.health.semantic_matching ? 'Yes' : 'No'} />
            <InfoChip label="Schema" value={String(node.health.schema_version ?? '—')} />
            <InfoChip
              label="Entity Types"
              value={String((node.health.entity_types as string[])?.length ?? 0)}
            />
          </div>
        </div>
      )}

      <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${nodeColor}20, transparent)` }} />

      {/* Holonic Hierarchy */}
      {(childNodes.length > 0 || !node.is_coordinator) && (
        <>
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Network Hierarchy</h3>
            {node.is_coordinator ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sub-nodes</div>
                {childNodes.map((child) => (
                  <div
                    key={child.node_id}
                    className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/20"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: child.status === 'healthy' ? '#22c55e' : '#ef4444',
                      }}
                    />
                    <span className="text-sm text-gray-300">{child.display_name}</span>
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${NODE_COLORS[child.node_id] ?? '#6b7280'}15`,
                        color: NODE_COLORS[child.node_id] ?? '#9ca3af',
                      }}
                    >
                      {child.bioregion_codes.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/20">
                <div className="text-xs text-gray-500 mb-1">Coordinator</div>
                <div className="text-sm text-gray-300">Salish Sea (Octo)</div>
              </div>
            )}
          </div>
          <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${nodeColor}20, transparent)` }} />
        </>
      )}

      {/* Stats */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Entity Counts</h3>
        {statsLoading ? (
          <div className="text-sm text-gray-500">Loading stats...</div>
        ) : statsData?.by_type ? (
          <div className="space-y-2">
            {Object.entries(statsData.by_type)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{type}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${Math.max(20, (count / Math.max(1, statsData.total_entities)) * 120)}px`, backgroundColor: `${nodeColor}30` }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(10, (count / Math.max(1, statsData.total_entities)) * 100)}%`,
                          backgroundColor: nodeColor,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono text-gray-300 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            <div className="pt-2 border-t border-gray-700/30 flex justify-between text-sm">
              <span className="text-gray-400">Total</span>
              <span className="font-mono text-white">{statsData.total_entities}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No stats available</div>
        )}
      </div>

      <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${nodeColor}20, transparent)` }} />

      {/* Capabilities */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Capabilities</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(node.capabilities).map(([cap, enabled]) => (
            <span
              key={cap}
              className={`text-xs px-2 py-1 rounded-full border ${
                enabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-gray-700/30 border-gray-600/30 text-gray-500'
              }`}
            >
              {cap.replace('supports_', '')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
