'use client';

import { useState } from 'react';
import { useNodes } from '@/hooks/useNodes';
import { useWebProcess } from '@/hooks/useWebProcess';
import type { WebProcessResponse } from '@/hooks/useWebProcess';
import { EntityPreview } from './EntityPreview';
import { apiPath } from '@/lib/constants';

type IngestState = 'input' | 'extracting' | 'preview' | 'ingesting' | 'done';

export function IngestPanel() {
  const [nodeId, setNodeId] = useState('octo-salish-sea');
  const [url, setUrl] = useState('');
  const [state, setState] = useState<IngestState>('input');
  const [extractionResult, setExtractionResult] = useState<WebProcessResponse | null>(null);
  const [ingestResult, setIngestResult] = useState<WebProcessResponse | null>(null);

  const { data: nodesData } = useNodes();
  const nodes = nodesData?.nodes ?? [];

  const processMutation = useWebProcess(nodeId);

  async function handleExtract() {
    if (!url.trim()) return;
    setState('extracting');
    try {
      const result = await processMutation.mutateAsync({ url: url.trim(), auto_ingest: false });
      setExtractionResult(result);
      setState('preview');
    } catch (err) {
      setState('input');
      alert((err as Error).message || 'Extraction failed');
    }
  }

  async function handleConfirmIngest() {
    if (!url.trim()) return;
    setState('ingesting');
    try {
      const result = await processMutation.mutateAsync({ url: url.trim(), auto_ingest: true });
      setIngestResult(result);
      setState('done');
    } catch (err) {
      setState('preview');
      alert((err as Error).message || 'Ingest failed');
    }
  }

  function handleReset() {
    setUrl('');
    setExtractionResult(null);
    setIngestResult(null);
    setState('input');
    processMutation.reset();
  }

  const stats = ingestResult?.ingestion_stats;

  return (
    <div className="max-w-2xl mx-auto">
      {/* State: Input */}
      {(state === 'input' || state === 'extracting') && (
        <div className="space-y-4">
          {/* Node selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Target node
            </label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              {nodes.length > 0 ? (
                nodes.map((n: { node_id: string; display_name: string }) => (
                  <option key={n.node_id} value={n.node_id}>{n.display_name}</option>
                ))
              ) : (
                <option value="octo-salish-sea">Salish Sea (Octo)</option>
              )}
            </select>
          </div>

          {/* URL input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              URL to ingest
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              placeholder="https://..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Article, doc, meeting notes, PRD — any URL with readable text
            </p>
          </div>

          <button
            onClick={handleExtract}
            disabled={!url.trim() || state === 'extracting'}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {state === 'extracting' ? 'Extracting entities...' : 'Extract & Preview'}
          </button>

          {state === 'extracting' && (
            <p className="text-xs text-gray-500 text-center animate-pulse">
              Fetching content and running LLM extraction — this may take 20–40 seconds...
            </p>
          )}
        </div>
      )}

      {/* State: Preview */}
      {state === 'preview' && extractionResult && (
        <div className="space-y-5">
          {/* Title + summary */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <h3 className="text-base font-semibold text-white mb-1">{extractionResult.title}</h3>
            {extractionResult.summary && (
              <p className="text-sm text-gray-400">{extractionResult.summary}</p>
            )}
            {extractionResult.model_used && (
              <p className="text-xs text-gray-600 mt-2">Extracted via {extractionResult.model_used}</p>
            )}
          </div>

          {/* Entity counts */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400">
              <span className="text-white font-medium">{extractionResult.entities.length}</span> entities
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-400">
              <span className="text-white font-medium">{extractionResult.relationships.length}</span> relationships
            </span>
          </div>

          {/* Entity preview */}
          <EntityPreview entities={extractionResult.entities} />

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirmIngest}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Confirm Ingest
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* State: Ingesting */}
      {state === 'ingesting' && (
        <div className="text-center py-8 space-y-3">
          <p className="text-white font-medium">Ingesting into knowledge graph...</p>
          <p className="text-sm text-gray-500 animate-pulse">Writing entities and relationships to the node</p>
        </div>
      )}

      {/* State: Done */}
      {state === 'done' && ingestResult && (
        <div className="space-y-5">
          {/* Receipt */}
          <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-medium text-sm">Ingested successfully</span>
            </div>
            {stats && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{stats.new_entities}</div>
                  <div className="text-xs text-gray-500">new entities</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.resolved_entities}</div>
                  <div className="text-xs text-gray-500">resolved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.new_relationships}</div>
                  <div className="text-xs text-gray-500">relationships</div>
                </div>
              </div>
            )}
          </div>

          {/* Entities that were ingested */}
          {ingestResult.entities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Ingested entities</h4>
              <EntityPreview entities={ingestResult.entities} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <a
              href={`${apiPath('/')}?chat=What+architecture+does+owocki+propose+for+bioregional+swarms%3F`}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors text-center"
            >
              Ask about this →
            </a>
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Ingest another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
