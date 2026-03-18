'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface PoolNodeData {
  pool_rid: string
  name: string
  state: string
  need_tags: string[]
  total_pledges: number
  verified_pledges: number
  threshold_pct_current: number
}

const poolStateColors: Record<string, { bg: string; text: string }> = {
  forming: { bg: 'bg-amber-900/50', text: 'text-amber-300' },
  active: { bg: 'bg-emerald-900/50', text: 'text-emerald-300' },
}

function PoolNode({ data, selected }: NodeProps) {
  const d = data as unknown as PoolNodeData
  const colors = poolStateColors[d.state] || poolStateColors.forming
  const tags = d.need_tags || []
  const visibleTags = tags.slice(0, 3)
  const overflow = tags.length - 3
  const thresholdPct = Math.min(100, d.threshold_pct_current)

  return (
    <div
      className={`
        bg-gray-800 rounded-lg shadow-lg border min-w-[240px] max-w-[240px] p-3
        transition-all duration-200
        ${selected ? 'border-pink-500 shadow-pink-500/20' : 'border-gray-700'}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-gray-800"
      />

      <div className="text-sm font-medium text-gray-100 leading-tight mb-2">
        {d.name}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide ${colors.bg} ${colors.text}`}
        >
          {d.state}
        </span>
        <span className="text-[10px] text-gray-500">
          {d.verified_pledges}/{d.total_pledges} verified
        </span>
      </div>

      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded"
            >
              {tag}
            </span>
          ))}
          {overflow > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 text-gray-500">
              +{overflow}
            </span>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
            Threshold
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            {thresholdPct.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              thresholdPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${thresholdPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default memo(PoolNode)
