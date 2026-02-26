'use client';

import { useState } from 'react';
import { useEntities } from '@/hooks/useEntities';
import { useNodeStats } from '@/hooks/useNodeStats';

interface EntityBrowserProps {
  nodeId: string;
  nodeColor: string;
  onSelectEntity: (uri: string) => void;
}

const PAGE_SIZE = 20;

export default function EntityBrowser({ nodeId, nodeColor, onSelectEntity }: EntityBrowserProps) {
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState(0);

  const { data: statsData } = useNodeStats(nodeId);
  const { data: entitiesData, isLoading } = useEntities(nodeId, selectedType, PAGE_SIZE, offset);

  const entityTypes = statsData?.by_type ? Object.keys(statsData.by_type).sort() : [];
  const entities = entitiesData?.entities ?? [];
  const total = entitiesData?.total ?? 0;
  const hasMore = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-3">
      {/* Type filter */}
      <div>
        <select
          value={selectedType ?? ''}
          onChange={(e) => {
            setSelectedType(e.target.value || undefined);
            setOffset(0);
          }}
          className="w-full bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-600"
        >
          <option value="">All types ({statsData?.total_entities ?? 0})</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type} ({statsData?.by_type[type] ?? 0})
            </option>
          ))}
        </select>
      </div>

      {/* Entity list */}
      {isLoading ? (
        <div className="text-sm text-gray-500 py-4 text-center">Loading entities...</div>
      ) : entities.length === 0 ? (
        <div className="text-sm text-gray-500 py-4 text-center">No entities found</div>
      ) : (
        <div className="space-y-1">
          {entities.map((entity) => (
            <button
              key={entity.uri}
              onClick={() => onSelectEntity(entity.uri)}
              className="w-full text-left bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/20 hover:border-gray-700/40 rounded-lg px-3 py-2.5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-200 group-hover:text-white truncate">
                  {entity.label}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded ml-2 flex-shrink-0"
                  style={{
                    backgroundColor: `${nodeColor}15`,
                    color: nodeColor,
                  }}
                >
                  {entity.entity_type}
                </span>
              </div>
              {entity.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entity.description}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(offset > 0 || hasMore) && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="text-xs text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasMore}
            className="text-xs text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
