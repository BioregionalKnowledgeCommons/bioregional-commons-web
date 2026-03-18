'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react'
import type { Node, Edge, EdgeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './routing.css'

import CommitmentNode from './CommitmentNode'
import PoolNode from './PoolNode'
import type { CommitmentNodeData } from './CommitmentNode'
import type { PoolNodeData } from './PoolNode'
import type { RoutingOverviewResponse, RoutingEdge } from '@/hooks/useRoutingOverview'

const nodeTypes = {
  commitment: CommitmentNode,
  pool: PoolNode,
}

const ROUTABLE_STATES = new Set(['PROPOSED', 'VERIFIED'])

interface RoutingCanvasProps {
  data: RoutingOverviewResponse
  onEdgeSelect: (edge: RoutingEdge | null) => void
}

function dataToGraph(data: RoutingOverviewResponse): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []

  // Commitment nodes on the left
  data.commitments.forEach((c, i) => {
    const nodeData: CommitmentNodeData = {
      commitment_rid: c.commitment_rid,
      title: c.title,
      state: c.state,
      offer_type: c.offer_type,
      estimated_value_usd: c.metadata?.estimated_value_usd ?? null,
      routing_tags: c.metadata?.routing_tags || [],
      routable: ROUTABLE_STATES.has(c.state),
    }
    nodes.push({
      id: `c-${c.commitment_rid}`,
      type: 'commitment',
      position: { x: 50, y: i * 140 },
      data: nodeData as unknown as Record<string, unknown>,
    })
  })

  // Pool nodes on the right
  data.pools.forEach((p, j) => {
    const nodeData: PoolNodeData = {
      pool_rid: p.pool_rid,
      name: p.name,
      state: p.state,
      need_tags: p.need_tags,
      total_pledges: p.total_pledges,
      verified_pledges: p.verified_pledges,
      threshold_pct_current: p.threshold_pct_current,
    }
    nodes.push({
      id: `p-${p.pool_rid}`,
      type: 'pool',
      position: { x: 550, y: j * 160 },
      data: nodeData as unknown as Record<string, unknown>,
    })
  })

  // Routing edges
  const edges: Edge[] = data.routingEdges.map((re) => {
    const hasExcludes = re.hard_excludes.length > 0
    const strokeWidth = 1 + (re.total_score / 100) * 3
    const color = re.recommended
      ? '#22c55e'
      : hasExcludes
        ? '#f59e0b'
        : '#6b7280'

    return {
      id: `re-${re.commitment_rid}:${re.pool_rid}`,
      source: `c-${re.commitment_rid}`,
      target: `p-${re.pool_rid}`,
      animated: re.recommended,
      label: String(re.total_score),
      labelStyle: { fill: '#9ca3af', fontSize: 10 },
      labelBgStyle: { fill: '#111827', fillOpacity: 0.8 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        stroke: color,
        strokeWidth,
        opacity: 0.85,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 12,
        height: 12,
      },
      data: { routingEdge: re },
    }
  })

  return { nodes, edges }
}

export default function RoutingCanvas({ data, onEdgeSelect }: RoutingCanvasProps) {
  const { nodes, edges } = useMemo(() => dataToGraph(data), [data])

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      const re = edge.data?.routingEdge as RoutingEdge | undefined
      onEdgeSelect(re ?? null)
    },
    [onEdgeSelect]
  )

  const onPaneClick = useCallback(() => {
    onEdgeSelect(null)
  }, [onEdgeSelect])

  return (
    <div className="w-full h-full routing-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        className="bg-gray-950"
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm" />
      </ReactFlow>
    </div>
  )
}
