'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCommonsIntake,
  useCommonsDecide,
  useCommonsDecisions,
  useMergeCandidates,
  useResolveMerges,
  type CommonsShare,
  type MergeCandidate,
} from '@/hooks/useCommonsIntake';

interface CommonsTabProps {
  nodeId: string;
  nodeColor: string;
}

const STATUS_FILTERS = [
  { key: 'staged', label: 'Staged' },
  { key: 'approved', label: 'Approved' },
  { key: 'ingesting', label: 'Ingesting' },
  { key: 'needs_merge_review', label: 'Merge Review' },
  { key: 'ingested', label: 'Ingested' },
  { key: 'failed', label: 'Failed' },
  { key: 'all', label: 'All' },
] as const;

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  staged: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  approved: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  ingesting: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
  needs_merge_review: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  ingested: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  rejected: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE[status] ?? STATUS_BADGE.staged;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
    >
      {status === 'ingesting' && (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function entityCountFromManifest(manifest: Record<string, unknown>): number {
  if (typeof manifest?.entity_count === 'number') return manifest.entity_count;
  if (manifest?.entities && typeof manifest.entities === 'object') {
    return Object.keys(manifest.entities).length;
  }
  return 0;
}

function DecisionHistory({ nodeId, shareId }: { nodeId: string; shareId: number }) {
  const { data, isLoading } = useCommonsDecisions(nodeId, shareId);

  if (isLoading) return <div className="text-xs text-gray-500 py-1">Loading...</div>;
  if (!data?.decisions?.length)
    return <div className="text-xs text-gray-600 py-1">No decisions yet</div>;

  return (
    <div className="space-y-1.5 mt-2">
      {data.decisions.map((d) => (
        <div
          key={d.id}
          className="flex items-start gap-2 text-xs bg-gray-900/50 rounded px-2 py-1.5"
        >
          <StatusBadge status={d.action} />
          <div className="flex-1 min-w-0">
            {d.reviewer && (
              <span className="text-gray-400">{d.reviewer}</span>
            )}
            {d.note && (
              <span className="text-gray-500 ml-1">— {d.note}</span>
            )}
          </div>
          <span className="text-gray-600 shrink-0">{formatTime(d.decided_at)}</span>
        </div>
      ))}
    </div>
  );
}

const RESOLUTION_OPTIONS: { value: MergeCandidate['resolution'] & string; label: string; active: string }[] = [
  { value: 'merge', label: 'Merge', active: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' },
  { value: 'keep_separate', label: 'Keep Separate', active: 'bg-blue-500/20 border-blue-500/50 text-blue-300' },
  { value: 'cross_ref', label: 'Cross-Ref', active: 'bg-amber-500/20 border-amber-500/50 text-amber-300' },
];

function MergeReviewPanel({
  nodeId,
  shareId,
  nodeColor,
}: {
  nodeId: string;
  shareId: number;
  nodeColor: string;
}) {
  const { data, isLoading } = useMergeCandidates(nodeId, shareId);
  const resolveMutation = useResolveMerges(nodeId);
  const [pending, setPending] = useState<Record<number, string>>({});

  if (isLoading) return <div className="text-xs text-gray-500 py-2">Loading merge candidates...</div>;
  if (!data?.candidates?.length)
    return <div className="text-xs text-gray-600 py-2">No merge candidates</div>;

  const unresolved = data.candidates.filter((c) => c.resolution === null);
  const resolved = data.candidates.filter((c) => c.resolution !== null);

  const handleResolve = (candidateId: number, resolution: string) => {
    setPending((prev) => ({ ...prev, [candidateId]: resolution }));
  };

  const handleSubmit = () => {
    const resolutions = Object.entries(pending).map(([id, resolution]) => ({
      candidate_id: Number(id),
      resolution: resolution as 'merge' | 'keep_separate' | 'cross_ref',
    }));
    if (resolutions.length === 0) return;
    resolveMutation.mutate(
      { share_id: shareId, resolutions },
      { onSuccess: () => setPending({}) }
    );
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-700/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-orange-400">
          {unresolved.length} unresolved merge candidate{unresolved.length !== 1 ? 's' : ''}
        </span>
        {Object.keys(pending).length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={resolveMutation.isPending}
            className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
          >
            {resolveMutation.isPending ? 'Submitting...' : `Submit ${Object.keys(pending).length} resolution${Object.keys(pending).length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {unresolved.map((c) => (
        <div
          key={c.id}
          className="bg-gray-900/50 rounded-lg p-2.5 space-y-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-gray-200">
                <span className="font-medium">{c.remote_entity_label}</span>
                {c.remote_entity_type && (
                  <span className="text-gray-500 ml-1">({c.remote_entity_type})</span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                matches <span className="text-gray-400">{c.local_entity_label}</span>
              </div>
            </div>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: `${nodeColor}15`, color: nodeColor }}
            >
              {(c.confidence * 100).toFixed(0)}% match
            </span>
          </div>
          <div className="flex gap-1.5">
            {RESOLUTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleResolve(c.id, opt.value)}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  pending[c.id] === opt.value
                    ? opt.active
                    : 'bg-gray-800/50 border-gray-700/30 text-gray-500 hover:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <details className="text-xs">
          <summary className="text-gray-600 hover:text-gray-400 cursor-pointer py-1">
            {resolved.length} resolved
          </summary>
          <div className="space-y-1 mt-1">
            {resolved.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[10px] text-gray-600 px-2 py-1 bg-gray-900/30 rounded">
                <span className="text-gray-400">{c.remote_entity_label}</span>
                <span>→</span>
                <span>{c.resolution?.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ShareCard({
  share,
  nodeId,
  nodeColor,
}: {
  share: CommonsShare;
  nodeId: string;
  nodeColor: string;
}) {
  const decideMutation = useCommonsDecide(nodeId);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMergeReview, setShowMergeReview] = useState(share.intake_status === 'needs_merge_review');
  const entityCount = entityCountFromManifest(share.manifest);
  const isStaged = share.intake_status === 'staged';
  const needsMergeReview = share.intake_status === 'needs_merge_review';

  const handleDecide = (action: 'approve' | 'reject') => {
    decideMutation.mutate({
      share_id: share.id,
      action,
      note: note.trim() || undefined,
    });
    setNote('');
    setShowNote(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-gray-200 font-mono truncate">
            {share.document_rid}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{share.sender}</span>
            <span className="text-gray-700">from</span>
            <span className="truncate max-w-[140px]">{share.sender_node_rid}</span>
          </div>
        </div>
        <StatusBadge status={share.intake_status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{formatTime(share.received_at)}</span>
        {entityCount > 0 && (
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${nodeColor}10`,
              color: nodeColor,
            }}
          >
            {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
          </span>
        )}
        {share.has_contents && (
          <span className="text-gray-600">has contents</span>
        )}
      </div>

      {/* Actions for staged items */}
      {isStaged && (
        <div className="mt-3 pt-3 border-t border-gray-700/20">
          {showNote && (
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="Optional note..."
              className="w-full bg-gray-900/50 border border-gray-700/30 rounded px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 mb-2"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDecide('approve')}
              disabled={decideMutation.isPending}
              className="flex-1 text-xs py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
            >
              {decideMutation.isPending ? 'Deciding...' : 'Approve'}
            </button>
            <button
              onClick={() => handleDecide('reject')}
              disabled={decideMutation.isPending}
              className="flex-1 text-xs py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
            >
              Reject
            </button>
            <button
              onClick={() => setShowNote(!showNote)}
              className="text-xs px-2 py-1.5 rounded-md bg-gray-700/30 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-colors"
              title="Add note"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Merge review section */}
      {needsMergeReview && (
        <MergeReviewPanel nodeId={nodeId} shareId={share.id} nodeColor={nodeColor} />
      )}

      {/* Decision history toggle */}
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          {showHistory ? 'Hide' : 'Show'} decision history
        </button>
        {!needsMergeReview && (share.intake_status === 'ingested' || share.intake_status === 'approved') && (
          <button
            onClick={() => setShowMergeReview(!showMergeReview)}
            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showMergeReview ? 'Hide' : 'Show'} merge candidates
          </button>
        )}
      </div>
      {showHistory && <DecisionHistory nodeId={nodeId} shareId={share.id} />}
      {showMergeReview && !needsMergeReview && (
        <MergeReviewPanel nodeId={nodeId} shareId={share.id} nodeColor={nodeColor} />
      )}
    </motion.div>
  );
}

export default function CommonsTab({ nodeId, nodeColor }: CommonsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('staged');
  const { data, isLoading, isError } = useCommonsIntake(nodeId, statusFilter);

  return (
    <div className="p-6 max-sm:p-4 space-y-4 pb-12">
      {/* Status filter bar */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              statusFilter === f.key
                ? 'bg-gray-700/60 text-white border-gray-600/50'
                : 'bg-gray-800/30 text-gray-500 border-gray-700/20 hover:text-gray-300 hover:border-gray-600/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(to right, transparent, ${nodeColor}20, transparent)`,
        }}
      />

      {/* Content */}
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="flex justify-center gap-1 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-gray-500">Loading intake queue...</p>
        </div>
      ) : isError ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-400">Failed to load intake data</p>
          <p className="text-xs text-gray-600 mt-1">
            The commons admin API may not be available on this node
          </p>
        </div>
      ) : !data?.documents?.length ? (
        <div className="py-8 text-center">
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
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400">No {statusFilter} documents</p>
          <p className="text-xs text-gray-600 mt-1">
            Shared documents will appear here when received via federation
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500">
            {data.count} document{data.count !== 1 ? 's' : ''}
          </div>
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {data.documents.map((share) => (
                <ShareCard
                  key={share.id}
                  share={share}
                  nodeId={nodeId}
                  nodeColor={nodeColor}
                />
              ))}
            </div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
