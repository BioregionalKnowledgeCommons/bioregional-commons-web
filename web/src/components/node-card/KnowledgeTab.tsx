'use client';

import { useState } from 'react';
import EntityBrowser from './EntityBrowser';
import GraphView from './GraphView';

interface KnowledgeTabProps {
  nodeId: string;
  nodeColor: string;
}

type View = 'browser' | 'graph';

export default function KnowledgeTab({ nodeId, nodeColor }: KnowledgeTabProps) {
  const [view, setView] = useState<View>('browser');
  const [selectedEntityUri, setSelectedEntityUri] = useState<string | null>(null);

  return (
    <div className="p-6 max-sm:p-4 space-y-4 pb-12">
      {/* View toggle */}
      <div className="flex bg-gray-800/50 rounded-lg p-0.5 border border-gray-700/30">
        <button
          onClick={() => setView('browser')}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
            view === 'browser'
              ? 'bg-gray-700/60 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Browser
        </button>
        <button
          onClick={() => setView('graph')}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
            view === 'graph'
              ? 'bg-gray-700/60 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Graph
        </button>
      </div>

      {view === 'browser' ? (
        <EntityBrowser
          nodeId={nodeId}
          nodeColor={nodeColor}
          onSelectEntity={(uri) => {
            setSelectedEntityUri(uri);
            setView('graph');
          }}
        />
      ) : (
        <GraphView
          nodeId={nodeId}
          nodeColor={nodeColor}
          seedUri={selectedEntityUri}
          onSelectEntity={setSelectedEntityUri}
        />
      )}
    </div>
  );
}
