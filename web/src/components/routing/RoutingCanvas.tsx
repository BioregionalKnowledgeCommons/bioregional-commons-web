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

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force'
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'

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

interface SimNode extends SimulationNodeDatum {
  id: string
  type: 'commitment' | 'pool'
  width: number
  height: number
}

function forceLayout(
  nodeList: { id: string; type: 'commitment' | 'pool' }[],
  links: { source: string; target: string; score: number }[]
): Map<string, { x: number; y: number }> {
  const simNodes: SimNode[] = nodeList.map((n) => ({
    id: n.id,
    type: n.type,
    // approximate node card dimensions for collision
    width: n.type === 'pool' ? 240 : 220,
    height: n.type === 'pool' ? 120 : 100,
    x: (Math.random() - 0.5) * 600,
    y: (Math.random() - 0.5) * 600,
  }))

  const nodeById = new Map(simNodes.map((n) => [n.id, n]))

  const simLinks: SimulationLinkDatum<SimNode>[] = links.map((l) => ({
    source: nodeById.get(l.source)!,
    target: nodeById.get(l.target)!,
  }))

  forceSimulation(simNodes)
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((d) => d.id)
        .distance(200)
        .strength(0.4)
    )
    .force('charge', forceManyBody<SimNode>().strength((d) => d.type === 'pool' ? -800 : -200))
    .force('center', forceCenter(0, 0))
    .force(
      'collide',
      forceCollide<SimNode>().radius((d) => Math.max(d.width, d.height) / 2 + 20)
    )
    // Gently separate pools horizontally, commitments cluster inward
    .force('x', forceX<SimNode>().strength((d) => d.type === 'pool' ? 0.05 : 0.01))
    .force('y', forceY<SimNode>().strength(0.01))
    .stop()
    .tick(200)

  const positions = new Map<string, { x: number; y: number }>()
  for (const n of simNodes) {
    positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 })
  }
  return positions
}

function dataToGraph(data: RoutingOverviewResponse): { nodes: Node[]; edges: Edge[] } {
  // Build node list for simulation
  const simNodeList: { id: string; type: 'commitment' | 'pool' }[] = []
  const nodeDataMap = new Map<string, { rfNode: Omit<Node, 'position'> }>()

  data.commitments.forEach((c) => {
    const id = `c-${c.commitment_rid}`
    const nodeData: CommitmentNodeData = {
      commitment_rid: c.commitment_rid,
      title: c.title,
      state: c.state,
      offer_type: c.offer_type,
      estimated_value_usd: c.metadata?.estimated_value_usd ?? null,
      routing_tags: c.metadata?.routing_tags || [],
      routable: ROUTABLE_STATES.has(c.state),
    }
    simNodeList.push({ id, type: 'commitment' })
    nodeDataMap.set(id, {
      rfNode: {
        id,
        type: 'commitment',
        data: nodeData as unknown as Record<string, unknown>,
      },
    })
  })

  data.pools.forEach((p) => {
    const id = `p-${p.pool_rid}`
    const nodeData: PoolNodeData = {
      pool_rid: p.pool_rid,
      name: p.name,
      state: p.state,
      need_tags: p.need_tags,
      total_pledges: p.total_pledges,
      verified_pledges: p.verified_pledges,
      threshold_pct_current: p.threshold_pct_current,
    }
    simNodeList.push({ id, type: 'pool' })
    nodeDataMap.set(id, {
      rfNode: {
        id,
        type: 'pool',
        data: nodeData as unknown as Record<string, unknown>,
      },
    })
  })

  // Build links for simulation (only routable edges)
  const simLinks = data.routingEdges.map((re) => ({
    source: `c-${re.commitment_rid}`,
    target: `p-${re.pool_rid}`,
    score: re.total_score,
  }))

  // Run force simulation
  const positions = forceLayout(simNodeList, simLinks)

  // Build ReactFlow nodes with computed positions
  const nodes: Node[] = simNodeList.map((sn) => {
    const entry = nodeDataMap.get(sn.id)!
    const pos = positions.get(sn.id) ?? { x: 0, y: 0 }
    return {
      ...entry.rfNode,
      position: pos,
    }
  })

  // Build edges
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
