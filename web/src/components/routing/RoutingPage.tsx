'use client'

import { useState } from 'react'
import { useRoutingOverview } from '@/hooks/useRoutingOverview'
import type { RoutingEdge } from '@/hooks/useRoutingOverview'
import RoutingCanvas from './RoutingCanvas'
import ScorePanel from './ScorePanel'

export default function RoutingPage() {
  const { data, isLoading, error } = useRoutingOverview()
  const [selectedEdge, setSelectedEdge] = useState<RoutingEdge | null>(null)

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading routing data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="text-red-400 text-sm">
          Failed to load routing data: {error.message}
        </div>
      </div>
    )
  }

  if (!data || (data.commitments.length === 0 && data.pools.length === 0)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="text-gray-500 text-sm">
          No commitments or pools found on this node.
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <RoutingCanvas data={data} onEdgeSelect={setSelectedEdge} />
      <ScorePanel edge={selectedEdge} onClose={() => setSelectedEdge(null)} />
    </div>
  )
}
