'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNodes } from '@/hooks/useNodes';
import { useEntities } from '@/hooks/useEntities';
import type { KoiEntity } from '@/types';

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

export default function EntitiesPage() {
  const [selectedNode, setSelectedNode] = useState<string>('octo-salish-sea');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: nodesData } = useNodes();
  const { data: entitiesData, isLoading } = useEntities(
    selectedNode,
    typeFilter || undefined,
    limit,
    page * limit
  );

  const nodes = nodesData?.nodes ?? [];
  const entities = entitiesData?.entities ?? [];

  const entityTypes = [
    'Person', 'Organization', 'Project', 'Location', 'Concept',
    'Meeting', 'Practice', 'Pattern', 'CaseStudy', 'Bioregion',
    'Protocol', 'Playbook', 'Question', 'Claim', 'Evidence',
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                &larr; Globe
              </Link>
              <h1 className="text-lg font-semibold">Entity Browser</h1>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Node selector */}
            <select
              value={selectedNode}
              onChange={(e) => {
                setSelectedNode(e.target.value);
                setPage(0);
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {nodes.map((n) => (
                <option key={n.node_id} value={n.node_id}>
                  {n.display_name} {n.status === 'unreachable' ? '(offline)' : ''}
                </option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Types</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {entitiesData?.total != null && (
              <span className="text-xs text-gray-500">
                {entitiesData.total} total
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Entity list */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading entities...</div>
        ) : entities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No entities found</div>
        ) : (
          <div className="space-y-2">
            {entities.map((entity: KoiEntity) => (
              <Link
                key={entity.uri}
                href={`/entities/${selectedNode}/${encodeURIComponent(entity.uri)}`}
                className="block bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 hover:bg-gray-800/50 hover:border-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                        style={{
                          color: ENTITY_TYPE_COLORS[entity.entity_type] ?? '#6b7280',
                          borderColor: `${ENTITY_TYPE_COLORS[entity.entity_type] ?? '#6b7280'}40`,
                          backgroundColor: `${ENTITY_TYPE_COLORS[entity.entity_type] ?? '#6b7280'}10`,
                        }}
                      >
                        {entity.entity_type}
                      </span>
                      {entity.koi_rid && (
                        <span className="text-[10px] text-gray-600 font-mono truncate max-w-[200px]">
                          {entity.koi_rid}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-200 truncate">
                      {entity.label}
                    </h3>
                    {entity.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {entity.description}
                      </p>
                    )}
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {entities.length >= limit && (
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="flex items-center text-sm text-gray-500">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
