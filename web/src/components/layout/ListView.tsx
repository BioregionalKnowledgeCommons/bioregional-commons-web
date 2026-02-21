'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { DOMAIN_COLORS } from '@/types';
import type { NodeEntry } from '@/types';
import { LIVE_ONLY } from '@/lib/feature-flags';
import { useNodes } from '@/hooks/useNodes';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

type SortField = 'name' | 'date';

/** Pretty-print a thematic domain slug */
function formatDomain(domain: string): string {
  return domain
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Pretty-print a tag */
function formatTag(tag: string): string {
  return tag
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Format date to a readable string */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ListView() {
  const searchQuery = useGlobeStore((s) => s.searchQuery);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const [sortBy, setSortBy] = useState<SortField>('name');
  const { data: nodesData } = useNodes();
  const liveNodes = nodesData?.nodes ?? [];

  // Filter nodes by search query
  const filteredNodes = useMemo(() => {
    if (LIVE_ONLY) {
      // In LIVE_ONLY mode, show live KOI nodes as simple entries
      return [];
    }
    const q = searchQuery.trim().toLowerCase();
    if (!seedImports) return [];
    const { seedNodes, bioregionLookup } = seedImports;

    let nodes: NodeEntry[] = [...seedNodes];

    if (q) {
      nodes = nodes.filter((node) => {
        if (node.display_name.toLowerCase().includes(q)) return true;
        if (node.thematic_domain.toLowerCase().includes(q)) return true;
        if (node.topic_tags.some((tag: string) => tag.toLowerCase().includes(q)))
          return true;
        if (
          node.bioregion_codes.some((code: string) => {
            if (code.toLowerCase().includes(q)) return true;
            const bio = bioregionLookup[code];
            if (bio && bio.name.toLowerCase().includes(q)) return true;
            return false;
          })
        )
          return true;
        if (
          node.maintainers.some((m: string) => m.toLowerCase().includes(q))
        )
          return true;
        return false;
      });
    }

    // Sort
    nodes.sort((a, b) => {
      if (sortBy === 'name') {
        return a.display_name.localeCompare(b.display_name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return nodes;
  }, [searchQuery, sortBy]);

  const totalCount = LIVE_ONLY ? liveNodes.length : (seedImports?.seedNodes.length ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-10 overflow-y-auto"
    >
      <div className="min-h-screen bg-gray-950 pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Knowledge Commons
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {LIVE_ONLY ? liveNodes.length : filteredNodes.length} of {totalCount} nodes
                {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ''}
              </p>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-xl rounded-lg border border-gray-700/30 p-0.5">
              <button
                onClick={() => setSortBy('name')}
                className={[
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  sortBy === 'name'
                    ? 'bg-gray-700/60 text-white'
                    : 'text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                A–Z
              </button>
              <button
                onClick={() => setSortBy('date')}
                className={[
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  sortBy === 'date'
                    ? 'bg-gray-700/60 text-white'
                    : 'text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                Newest
              </button>
            </div>
          </div>

          {/* List */}
          {LIVE_ONLY ? (
            /* Live KOI nodes list */
            liveNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-gray-500">Loading live nodes...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {liveNodes.map((node, index) => (
                  <motion.button
                    key={node.node_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    onClick={() => setSelectedNode(node.node_id)}
                    className="w-full text-left bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 rounded-xl p-4 hover:border-gray-600/50 hover:bg-gray-800/80 transition-all duration-200 group shadow-lg shadow-black/10"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: node.status === 'healthy' ? '#22c55e' : '#ef4444' }}
                        />
                        <h3 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                          {node.display_name}
                        </h3>
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          {node.is_coordinator ? 'Coordinator' : 'Leaf Node'}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-600 flex-shrink-0">
                        {node.status === 'healthy' ? 'Live' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2 ml-4">
                      <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className="text-xs text-gray-500">
                        {node.bioregion_codes.join(', ')}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )
          ) : filteredNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-800/60 border border-gray-700/30 flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No commons found</p>
              <p className="text-xs text-gray-600 mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNodes.map((node, index) => {
                const domainColor =
                  DOMAIN_COLORS[node.thematic_domain] || '#7F8C8D';
                const bioregionNames = node.bioregion_codes
                  .map((code: string) => {
                    const bio = seedImports?.bioregionLookup[code];
                    return bio ? bio.name : code;
                  })
                  .join(', ');

                return (
                  <motion.button
                    key={node.node_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    onClick={() => setSelectedNode(node.node_id)}
                    className="w-full text-left bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 rounded-xl p-4 hover:border-gray-600/50 hover:bg-gray-800/80 transition-all duration-200 group shadow-lg shadow-black/10"
                  >
                    {/* Top row: Name + Domain badge + Date */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Domain color dot */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: domainColor }}
                        />
                        <h3 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                          {node.display_name}
                        </h3>
                        <span
                          className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium hidden sm:inline-block"
                          style={{
                            backgroundColor: `${domainColor}20`,
                            color: domainColor,
                            border: `1px solid ${domainColor}30`,
                          }}
                        >
                          {formatDomain(node.thematic_domain)}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-600 flex-shrink-0 tabular-nums">
                        {formatDate(node.created_at)}
                      </span>
                    </div>

                    {/* Bioregion */}
                    <div className="flex items-center gap-1.5 mb-2 ml-4">
                      <svg
                        className="w-3 h-3 text-gray-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                      <span className="text-xs text-gray-500">
                        {bioregionNames}
                      </span>
                    </div>

                    {/* Bottom row: Tags + Maintainers */}
                    <div className="flex items-center justify-between gap-3 ml-4">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {node.topic_tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-500 border border-gray-700/30"
                          >
                            {formatTag(tag)}
                          </span>
                        ))}
                        {node.topic_tags.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-gray-600">
                            +{node.topic_tags.length - 4}
                          </span>
                        )}
                      </div>

                      {/* Maintainers */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                          />
                        </svg>
                        <span className="text-[10px] text-gray-600">
                          {node.maintainers.length}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
