'use client'

import type { RoutingEdge } from '@/hooks/useRoutingOverview'

interface ScorePanelProps {
  edge: RoutingEdge | null
  onClose: () => void
}

const factors = [
  { key: 'same_bioregion', label: 'Same Bioregion', max: 30, color: 'bg-emerald-500' },
  { key: 'offer_need_overlap', label: 'Offer/Need Overlap', max: 25, color: 'bg-blue-500' },
  { key: 'timeframe_overlap', label: 'Timeframe', max: 15, color: 'bg-amber-500' },
  { key: 'capacity_fit', label: 'Capacity Fit', max: 20, color: 'bg-purple-500' },
  { key: 'governance_compat', label: 'Governance (v0)', max: 10, color: 'bg-gray-500' },
] as const

export default function ScorePanel({ edge, onClose }: ScorePanelProps) {
  if (!edge) return null

  const hasExcludes = edge.hard_excludes.length > 0

  return (
    <div className="absolute bottom-4 right-4 z-10 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl w-80">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 text-sm"
      >
        ✕
      </button>

      {/* Header */}
      <div className="text-xs text-gray-500 mb-1">Routing Score</div>
      <div className="text-sm text-gray-200 font-medium mb-3 pr-6">
        {edge.commitment_title} → {edge.pool_name}
      </div>

      {/* Total score + badges */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl font-bold text-white">{edge.total_score}</span>
        <span className="text-xs text-gray-500">/100</span>
        {edge.recommended && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 font-medium">
            Recommended
          </span>
        )}
        {hasExcludes && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 font-medium">
            Excluded
          </span>
        )}
      </div>

      {/* Hard excludes detail */}
      {hasExcludes && (
        <div className="mb-3 text-[10px] text-red-400">
          {edge.hard_excludes.map((reason) => (
            <div key={reason}>- {reason}</div>
          ))}
        </div>
      )}

      {/* Factor breakdown bars */}
      <div className="space-y-2 mb-4">
        {factors.map(({ key, label, max, color }) => {
          const value = edge.score_breakdown[key] ?? 0
          const pct = max > 0 ? (value / max) * 100 : 0
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-gray-400">{label}</span>
                <span className="text-[10px] font-mono text-gray-500">
                  {value}/{max}
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Explanation */}
      {edge.explanation && (
        <div className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
          {edge.explanation}
        </div>
      )}
    </div>
  )
}
