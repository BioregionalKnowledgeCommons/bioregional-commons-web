'use client';

import type { ExtractedEntity } from "@/hooks/useWebProcess";

const ENTITY_TYPE_COLORS: Record<string, string> = {
  Person: '#3b82f6',
  Organization: '#8b5cf6',
  Project: '#10b981',
  Location: '#f59e0b',
  Concept: '#6366f1',
  Meeting: '#ec4899',
  Practice: '#14b8a6',
  Pattern: '#f97316',
  CaseStudy: '#06b6d4',
  Bioregion: '#22c55e',
  Protocol: '#a855f7',
  Playbook: '#eab308',
  Question: '#ef4444',
  Claim: '#f43f5e',
  Evidence: '#84cc16',
};

interface EntityPreviewProps {
  entities: ExtractedEntity[];
}

export function EntityPreview({ entities }: EntityPreviewProps) {
  // Group by type
  const grouped = entities.reduce<Record<string, ExtractedEntity[]>>((acc, entity) => {
    const type = entity.type || 'Concept';
    if (!acc[type]) acc[type] = [];
    acc[type].push(entity);
    return acc;
  }, {});

  const sortedTypes = Object.keys(grouped).sort();

  if (entities.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic py-4 text-center">
        No entities extracted
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedTypes.map((type) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: ENTITY_TYPE_COLORS[type] ?? '#6b7280' }}
            />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {type} ({grouped[type].length})
            </span>
          </div>
          <div className="space-y-1.5 ml-4">
            {grouped[type].map((entity, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-white">{entity.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {Math.round(entity.confidence * 100)}%
                  </span>
                </div>
                {entity.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entity.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
