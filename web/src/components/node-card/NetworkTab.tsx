'use client';

interface NetworkTabProps {
  nodeId: string;
  nodeColor: string;
}

export default function NetworkTab({ nodeId, nodeColor }: NetworkTabProps) {
  return (
    <div className="p-6 max-sm:p-4 pb-12">
      <div className="text-center py-8">
        <div
          className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: `${nodeColor}15` }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: nodeColor }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-400">Federation Network</p>
        <p className="text-xs text-gray-600 mt-1">
          Peer connections and event exchange for {nodeId}
        </p>
      </div>
    </div>
  );
}
