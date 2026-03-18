'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface CommitmentNodeData {
  commitment_rid: string
  title: string
  state: string
  offer_type: string
  estimated_value_usd: number | null
  routing_tags: string[]
  routable: boolean
}

const stateColors: Record<string, { bg: string; text: string }> = {
  PROPOSED: { bg: 'bg-yellow-900/50', text: 'text-yellow-300' },
  VERIFIED: { bg: 'bg-emerald-900/50', text: 'text-emerald-300' },
  ACTIVE: { bg: 'bg-blue-900/50', text: 'text-blue-300' },
  REDEEMED: { bg: 'bg-purple-900/50', text: 'text-purple-300' },
  WITHDRAWN: { bg: 'bg-red-900/50', text: 'text-red-300' },
  EXPIRED: { bg: 'bg-gray-700', text: 'text-gray-400' },
}

function CommitmentNode({ data, selected }: NodeProps) {
  const d = data as unknown as CommitmentNodeData
  const colors = stateColors[d.state] || stateColors.PROPOSED
  const truncTitle = d.title.length > 40 ? d.title.slice(0, 37) + '...' : d.title
  const tags = d.routing_tags || []
  const visibleTags = tags.slice(0, 3)
  const overflow = tags.length - 3

  return (
    <div
      className={`
        bg-gray-800 rounded-lg shadow-lg border min-w-[220px] max-w-[220px] p-3
        transition-all duration-200
        ${d.routable ? '' : 'opacity-50'}
        ${selected ? 'border-blue-500 shadow-blue-500/20' : 'border-gray-700'}
      `}
    >
      <div className="text-sm font-medium text-gray-100 leading-tight mb-2">
        {truncTitle}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide ${colors.bg} ${colors.text}`}
        >
          {d.state}
        </span>
        <span className="text-[10px] text-gray-500">{d.offer_type}</span>
      </div>

      {d.estimated_value_usd != null && (
        <div className="text-xs text-gray-400 mb-2">
          ${d.estimated_value_usd.toLocaleString()}
        </div>
      )}

      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
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

      {d.routable && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-gray-800"
        />
      )}
    </div>
  )
}

export default memo(CommitmentNode)
