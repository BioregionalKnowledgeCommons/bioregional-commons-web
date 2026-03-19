'use client'

import { useState, useMemo } from 'react'
import { useRoutingOverview } from '@/hooks/useRoutingOverview'
import type { RoutingEdge } from '@/hooks/useRoutingOverview'
import RoutingCanvas from './RoutingCanvas'
import ScorePanel from './ScorePanel'
import NodePanel from './NodePanel'

export default function RoutingPage() {
  const { data, isLoading, error } = useRoutingOverview()
  const [selectedEdge, setSelectedEdge] = useState<RoutingEdge | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Look up the selected node's source data
  const selectedCommitment = useMemo(() => {
    if (!selectedNodeId?.startsWith('c-') || !data) return null
    const rid = selectedNodeId.slice(2)
    return data.commitments.find((c) => c.commitment_rid === rid) ?? null
  }, [selectedNodeId, data])

  const selectedPool = useMemo(() => {
    if (!selectedNodeId?.startsWith('p-') || !data) return null
    const rid = selectedNodeId.slice(2)
    return data.pools.find((p) => p.pool_rid === rid) ?? null
  }, [selectedNodeId, data])

  // Edges connected to the selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId || !data) return []
    if (selectedNodeId.startsWith('c-')) {
      const rid = selectedNodeId.slice(2)
      return data.routingEdges.filter((e) => e.commitment_rid === rid)
    }
    if (selectedNodeId.startsWith('p-')) {
      const rid = selectedNodeId.slice(2)
      return data.routingEdges.filter((e) => e.pool_rid === rid)
    }
    return []
  }, [selectedNodeId, data])

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    if (nodeId) setSelectedEdge(null) // clear edge panel when selecting a node
  }

  const handleEdgeSelect = (edge: RoutingEdge | null) => {
    setSelectedEdge(edge)
    if (edge) setSelectedNodeId(null) // clear node panel when selecting an edge
  }

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
      <RoutingCanvas
        data={data}
        onEdgeSelect={handleEdgeSelect}
        onNodeSelect={handleNodeSelect}
      />
      <ScorePanel edge={selectedEdge} onClose={() => setSelectedEdge(null)} />
      <NodePanel
        commitment={selectedCommitment}
        pool={selectedPool}
        connectedEdges={connectedEdges}
        onClose={() => setSelectedNodeId(null)}
      />
    </div>
  )
}
