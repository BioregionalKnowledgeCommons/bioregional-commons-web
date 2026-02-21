'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobeStore } from '@/stores/globeStore';
import { seedNodes, bioregionLookup } from '@/data/seed-registry';
import { DOMAIN_COLORS } from '@/types';
import { useEntitySearch } from '@/hooks/useEntitySearch';

const MAX_RESULTS = 8;

export default function SearchOverlay() {
  const searchQuery = useGlobeStore((s) => s.searchQuery);
  const setSearchQuery = useGlobeStore((s) => s.setSearchQuery);
  const setSelectedNode = useGlobeStore((s) => s.setSelectedNode);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Live KOI entity search (searches coordinator node)
  const { data: liveSearchData, isLoading: liveSearchLoading } = useEntitySearch(
    'octo-salish-sea',
    searchQuery
  );
  const liveResults = liveSearchData?.results ?? [];

  // Filtered seed results
  const results = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return [];
    const q = searchQuery.toLowerCase().trim();

    return seedNodes
      .filter((node) => {
        // Search display name
        if (node.display_name.toLowerCase().includes(q)) return true;
        // Search thematic domain
        if (node.thematic_domain.toLowerCase().includes(q)) return true;
        // Search topic tags
        if (node.topic_tags.some((tag) => tag.toLowerCase().includes(q))) return true;
        // Search bioregion codes and names
        if (
          node.bioregion_codes.some((code) => {
            if (code.toLowerCase().includes(q)) return true;
            const bio = bioregionLookup[code];
            if (bio && bio.name.toLowerCase().includes(q)) return true;
            return false;
          })
        )
          return true;
        return false;
      })
      .slice(0, MAX_RESULTS);
  }, [searchQuery]);

  const showDropdown = isFocused && searchQuery.trim().length > 0;

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select a result
  const selectResult = useCallback(
    (nodeId: string) => {
      const node = seedNodes.find((n) => n.node_id === nodeId);
      if (!node) return;
      setSelectedNode(nodeId);
      // Fly to the bioregion centroid
      const bioCode = node.bioregion_codes[0];
      if (bioCode) {
        const bio = bioregionLookup[bioCode];
        if (bio) {
          const [lng, lat] = bio.centroid;
          flyTo(lat, lng);
        }
      }
      setSearchQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [setSelectedNode, flyTo, setSearchQuery]
  );

  // Keyboard shortcut: "/" or Cmd+K to focus
  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Keyboard navigation in results
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (searchQuery) {
        setSearchQuery('');
      } else {
        inputRef.current?.blur();
        setIsFocused(false);
      }
      return;
    }

    if (!showDropdown || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectResult(results[highlightedIndex].node_id);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={[
        'fixed top-4 left-1/2 -translate-x-1/2 z-30',
        'w-full max-w-md px-4',
        'max-sm:pl-14 max-sm:pr-4',
      ].join(' ')}
      role="search"
      aria-label="Search knowledge commons"
    >
      <div className="relative group">
        {/* Magnifying glass icon */}
        <div
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-300 transition-colors pointer-events-none"
          aria-hidden="true"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setHighlightedIndex(-1); }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search across all knowledge commons..."
          aria-label="Search across all knowledge commons"
          className={[
            'w-full h-10 pl-10 rounded-xl',
            'pr-20 max-sm:pr-10',
            'bg-gray-900/80 backdrop-blur-xl',
            'border border-gray-700/40',
            'text-sm text-gray-200 placeholder:text-gray-500',
            'focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-600/60',
            'transition-all duration-200',
            'shadow-lg shadow-black/20',
          ].join(' ')}
        />

        {/* Keyboard shortcut hints / clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="pointer-events-auto text-gray-500 hover:text-gray-300 transition-colors p-0.5"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-800/80 border border-gray-700/50">
                /
              </kbd>
              <span className="hidden sm:inline text-gray-600 text-[10px]">or</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-800/80 border border-gray-700/50">
                ⌘K
              </kbd>
            </>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-700/40 shadow-2xl shadow-black/40 overflow-hidden"
            >
              {(results.length > 0 || liveResults.length > 0) ? (
                <div className="py-1 max-h-[400px] overflow-y-auto">
                  {/* Seed node results */}
                  {results.length > 0 && (
                    <>
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Commons Nodes</span>
                      </div>
                      {results.map((node, index) => {
                        const bioCode = node.bioregion_codes[0];
                        const bio = bioCode ? bioregionLookup[bioCode] : null;
                        const domainColor = DOMAIN_COLORS[node.thematic_domain] ?? '#6b7280';

                        return (
                          <button
                            key={node.node_id}
                            onClick={() => selectResult(node.node_id)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={[
                              'w-full text-left px-3 py-2.5 transition-colors duration-100',
                              highlightedIndex === index
                                ? 'bg-gray-800/80'
                                : 'hover:bg-gray-800/50',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: domainColor }}
                              />
                              <span className="text-sm text-gray-100 font-medium truncate">
                                {node.display_name}
                              </span>
                              <span
                                className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0"
                                style={{
                                  color: domainColor,
                                  borderColor: `${domainColor}40`,
                                  backgroundColor: `${domainColor}15`,
                                }}
                              >
                                {node.thematic_domain}
                              </span>
                            </div>
                            {bio && (
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                <span className="text-xs text-gray-400">{bio.name}</span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {node.topic_tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-500 border border-gray-700/30"
                                >
                                  {tag}
                                </span>
                              ))}
                              {node.topic_tags.length > 3 && (
                                <span className="text-[10px] text-gray-600">
                                  +{node.topic_tags.length - 3}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Live KOI entity search results */}
                  {(liveResults.length > 0 || liveSearchLoading) && (
                    <>
                      <div className="px-3 pt-3 pb-1 border-t border-gray-800/50">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                          Knowledge Entities
                          {liveSearchLoading && <span className="ml-1 animate-pulse">...</span>}
                        </span>
                      </div>
                      {liveResults.map((result) => (
                        <a
                          key={result.uri}
                          href={`/entities/octo-salish-sea/${encodeURIComponent(result.uri)}`}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-100 font-medium truncate">
                              {result.label}
                            </span>
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0">
                              {result.entity_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500">
                              {(result.score * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </a>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">No results found</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Try searching by name, domain, bioregion, or tags
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
