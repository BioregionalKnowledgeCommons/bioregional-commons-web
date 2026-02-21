'use client';

import { use } from 'react';
import Link from 'next/link';
import { useEntity } from '@/hooks/useEntity';
import { useRelationships } from '@/hooks/useRelationships';
import type { KoiRelationship } from '@/types';

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

export default function EntityDetailPage({
  params,
}: {
  params: Promise<{ nodeId: string; uri: string }>;
}) {
  const { nodeId, uri: encodedUri } = use(params);
  const uri = decodeURIComponent(encodedUri);

  const { data: entity, isLoading: entityLoading } = useEntity(nodeId, uri);
  const { data: relsData, isLoading: relsLoading } = useRelationships(nodeId, uri);

  const relationships = relsData?.relationships ?? [];

  if (entityLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-500">Loading entity...</div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Entity not found</div>
          <Link href={`/entities`} className="text-blue-400 hover:text-blue-300 text-sm">
            &larr; Back to entity list
          </Link>
        </div>
      </div>
    );
  }

  const typeColor = ENTITY_TYPE_COLORS[entity.entity_type] ?? '#6b7280';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/entities"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            &larr; Entity Browser
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Entity Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{
                color: typeColor,
                borderColor: `${typeColor}40`,
                backgroundColor: `${typeColor}10`,
              }}
            >
              {entity.entity_type}
            </span>
            <span className="text-xs text-gray-600">on {nodeId}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{entity.label}</h1>
          {entity.description && (
            <p className="text-gray-400 text-sm leading-relaxed">{entity.description}</p>
          )}
          {entity.aliases && entity.aliases.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {entity.aliases.map((alias) => (
                <span
                  key={alias}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400"
                >
                  {alias}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {entity.uri && (
            <MetaChip label="URI" value={entity.uri} mono />
          )}
          {entity.koi_rid && (
            <MetaChip label="KOI RID" value={entity.koi_rid} mono />
          )}
          {entity.created_at && (
            <MetaChip label="Created" value={new Date(entity.created_at).toLocaleDateString()} />
          )}
        </div>

        {/* Relationships */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Relationships</h2>
          {relsLoading ? (
            <div className="text-gray-500 text-sm">Loading relationships...</div>
          ) : relationships.length === 0 ? (
            <div className="text-gray-500 text-sm">No relationships found</div>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel: KoiRelationship, i: number) => {
                const isSubject = rel.subject_uri === uri;
                const otherUri = isSubject ? rel.object_uri : rel.subject_uri;
                const otherLabel = isSubject ? rel.object_label : rel.subject_label;

                return (
                  <div
                    key={`${rel.predicate}-${i}`}
                    className="flex items-center gap-3 bg-gray-900/50 border border-gray-800/50 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-200 truncate">{entity.label}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-blue-400 font-mono whitespace-nowrap">
                          {rel.predicate}
                        </span>
                        <Link
                          href={`/entities/${nodeId}/${encodeURIComponent(otherUri)}`}
                          className="text-gray-200 hover:text-blue-400 transition-colors truncate"
                        >
                          {otherLabel}
                        </Link>
                      </div>
                    </div>
                    {rel.confidence != null && (
                      <span className="text-[10px] text-gray-600 font-mono whitespace-nowrap">
                        {(rel.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      <div className={`text-xs text-gray-300 truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
