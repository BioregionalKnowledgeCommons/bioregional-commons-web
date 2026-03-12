// Vendored from Jeff-Emmett/flow-funding (BioregionalKnowledgeCommons/flow-funding fork)
// Modified: BKC static demo data (Victoria Landscape Hub / Mycopunks settlement),
//           dark theme, accepts initialNodes/initialEdges props for live data mode

'use client'

import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './flow-funding.css'

import FunnelNode from './nodes/FunnelNode'
import OutcomeNode from './nodes/OutcomeNode'
import type { FlowNode, FlowEdge, FunnelNodeData, OutcomeNodeData } from './types'

const nodeTypes = {
  funnel: FunnelNode,
  outcome: OutcomeNode,
}

const SPENDING_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#6366f1']
const OVERFLOW_COLORS = ['#f59e0b', '#ef4444', '#f97316', '#eab308', '#dc2626', '#ea580c']

// BKC static demo data: Victoria Landscape Hub / Mycopunks TBFF settlement
// Based on real settlement logged via POST /claims/claim-from-settlement
// All amounts in USD. Threshold bands: auto <$500, semi $500-$5000, manual >$5000
const defaultNodes: FlowNode[] = [
  // Hub Cultivator funnel — top-level fund receiving external contributions
  {
    id: 'hub-cultivator',
    type: 'funnel',
    position: { x: 350, y: 0 },
    data: {
      label: 'Hub Cultivator',
      currentValue: 1200,
      minThreshold: 200,
      maxThreshold: 5000,
      maxCapacity: 10000,
      inflowRate: 100,
      overflowAllocations: [
        { targetId: 'victoria-landscape-hub', percentage: 40, color: OVERFLOW_COLORS[0] },
        { targetId: 'regenerate-cascadia', percentage: 35, color: OVERFLOW_COLORS[1] },
        { targetId: 'kinship-earth', percentage: 25, color: OVERFLOW_COLORS[2] },
      ],
      spendingAllocations: [],
    } as FunnelNodeData,
  },
  // TBFF participant funnels
  {
    id: 'victoria-landscape-hub',
    type: 'funnel',
    position: { x: 50, y: 250 },
    data: {
      label: 'Victoria Landscape Hub',
      currentValue: 380,
      minThreshold: 100,
      maxThreshold: 500,
      maxCapacity: 1000,
      inflowRate: 40,
      overflowAllocations: [],
      spendingAllocations: [
        { targetId: 'mycopunks-project', percentage: 65, color: SPENDING_COLORS[0] },
        { targetId: 'landscape-restoration', percentage: 35, color: SPENDING_COLORS[1] },
      ],
    } as FunnelNodeData,
  },
  {
    id: 'regenerate-cascadia',
    type: 'funnel',
    position: { x: 350, y: 250 },
    data: {
      label: 'Regenerate Cascadia',
      currentValue: 420,
      minThreshold: 150,
      maxThreshold: 500,
      maxCapacity: 1000,
      inflowRate: 35,
      overflowAllocations: [],
      spendingAllocations: [
        { targetId: 'mycopunks-project', percentage: 50, color: SPENDING_COLORS[0] },
        { targetId: 'bioregion-mapping', percentage: 50, color: SPENDING_COLORS[2] },
      ],
    } as FunnelNodeData,
  },
  {
    id: 'kinship-earth',
    type: 'funnel',
    position: { x: 650, y: 250 },
    data: {
      label: 'Kinship Earth',
      currentValue: 280,
      minThreshold: 100,
      maxThreshold: 500,
      maxCapacity: 800,
      inflowRate: 25,
      overflowAllocations: [],
      spendingAllocations: [
        { targetId: 'mycopunks-project', percentage: 100, color: SPENDING_COLORS[0] },
      ],
    } as FunnelNodeData,
  },
  // Outcome nodes — projects receiving funding
  {
    id: 'mycopunks-project',
    type: 'outcome',
    position: { x: 250, y: 520 },
    data: {
      label: 'Mycopunks Restoration',
      description: 'Urban mycelium restoration network in Greater Victoria',
      fundingReceived: 250,
      fundingTarget: 500,
      status: 'in-progress',
      claimState: 'verified',
      claimRid: 'orn:koi-net.claim:a42c60ce7e7f1848',
    } as OutcomeNodeData,
  },
  {
    id: 'landscape-restoration',
    type: 'outcome',
    position: { x: 50, y: 520 },
    data: {
      label: 'Landscape Restoration',
      description: 'Native plant restoration in Saanich Peninsula',
      fundingReceived: 0,
      fundingTarget: 1000,
      status: 'not-started',
    } as OutcomeNodeData,
  },
  {
    id: 'bioregion-mapping',
    type: 'outcome',
    position: { x: 480, y: 520 },
    data: {
      label: 'Bioregion Mapping',
      description: 'Cascadia watershed and ecoregion boundary mapping',
      fundingReceived: 0,
      fundingTarget: 800,
      status: 'not-started',
    } as OutcomeNodeData,
  },
]

// Generate edges from node allocations
function generateEdges(nodes: FlowNode[]): FlowEdge[] {
  const edges: FlowEdge[] = []

  nodes.forEach((node) => {
    if (node.type !== 'funnel') return
    const data = node.data as FunnelNodeData
    const sourceX = node.position.x

    data.overflowAllocations?.forEach((alloc) => {
      const strokeWidth = 2 + (alloc.percentage / 100) * 6
      const targetNode = nodes.find(n => n.id === alloc.targetId)
      if (!targetNode) return

      const targetX = targetNode.position.x
      const goingRight = targetX > sourceX
      const sourceHandle = goingRight ? 'outflow-right' : 'outflow-left'

      edges.push({
        id: `outflow-${node.id}-${alloc.targetId}`,
        source: node.id,
        target: alloc.targetId,
        sourceHandle: sourceHandle,
        targetHandle: undefined,
        animated: true,
        style: {
          stroke: alloc.color,
          strokeWidth,
          opacity: 0.8,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: alloc.color,
          width: 12,
          height: 12,
        },
        data: {
          allocation: alloc.percentage,
          color: alloc.color,
          edgeType: 'overflow' as const,
        },
        type: 'smoothstep',
      })
    })

    data.spendingAllocations?.forEach((alloc) => {
      const strokeWidth = 2 + (alloc.percentage / 100) * 6

      edges.push({
        id: `spending-${node.id}-${alloc.targetId}`,
        source: node.id,
        target: alloc.targetId,
        sourceHandle: undefined,
        animated: true,
        style: {
          stroke: alloc.color,
          strokeWidth,
          opacity: 0.9,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: alloc.color,
          width: 12,
          height: 12,
        },
        data: {
          allocation: alloc.percentage,
          color: alloc.color,
          edgeType: 'spending' as const,
        },
      })
    })
  })

  return edges
}

export interface FlowCanvasProps {
  initialNodes?: FlowNode[]
  mode?: 'live' | 'simulate' | 'static'
}

export default function FlowCanvas({ initialNodes: propNodes, mode = 'simulate' }: FlowCanvasProps) {
  const startNodes = propNodes || defaultNodes
  const [nodes, setNodes, onNodesChange] = useNodesState(startNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(generateEdges(startNodes))
  const [isSimulating, setIsSimulating] = useState(mode === 'simulate')

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
          },
          eds
        )
      ),
    [setEdges]
  )

  // Simulation effect
  useEffect(() => {
    if (!isSimulating) return

    const interval = setInterval(() => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === 'funnel') {
            const data = node.data as FunnelNodeData
            const change = (Math.random() - 0.45) * 50
            return {
              ...node,
              data: {
                ...data,
                currentValue: Math.max(0, Math.min(data.maxCapacity * 1.1, data.currentValue + change)),
              },
            }
          } else if (node.type === 'outcome') {
            const data = node.data as OutcomeNodeData
            const change = Math.random() * 10
            const newReceived = Math.min(data.fundingTarget * 1.05, data.fundingReceived + change)
            return {
              ...node,
              data: {
                ...data,
                fundingReceived: newReceived,
                status: newReceived >= data.fundingTarget ? 'completed' :
                        data.status === 'not-started' && newReceived > 0 ? 'in-progress' : data.status,
              },
            }
          }
          return node
        })
      )
    }, 500)

    return () => clearInterval(interval)
  }, [isSimulating, setNodes])

  // Regenerate edges when nodes change
  useEffect(() => {
    setEdges(generateEdges(nodes))
  }, [nodes, setEdges])

  return (
    <div className="w-full h-full flow-funding-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        className="bg-gray-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm" />

        {/* Title Panel */}
        <Panel position="top-left" className="bg-gray-800/90 backdrop-blur rounded-lg shadow-lg border border-gray-700 p-4 m-4">
          <h1 className="text-lg font-bold text-gray-100">Threshold-Based Flow Funding</h1>
          <p className="text-xs text-gray-400 mt-1">
            Victoria Landscape Hub / Mycopunks Settlement
          </p>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-emerald-400">Inflows</span> (top) &bull;
            <span className="text-amber-400 ml-1">Outflows</span> (sides) &bull;
            <span className="text-blue-400 ml-1">Outcomes</span> (bottom)
          </p>
          <p className="text-[10px] text-gray-600 mt-1">Double-click funnels to edit allocations</p>
        </Panel>

        {/* Simulation Toggle */}
        <Panel position="top-right" className="m-4">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm ${
              isSimulating
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {isSimulating ? 'Pause' : 'Start'}
          </button>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left" className="bg-gray-800/90 backdrop-blur rounded-lg shadow-lg border border-gray-700 p-3 m-4">
          <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Threshold Bands (USD)</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-400">Auto (&lt;$500) &mdash; auto-verified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-400">Semi ($500&ndash;$5k) &mdash; peer review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-400">Manual (&gt;$5k) &mdash; full review</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Flow Types</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-400">Inflows (top)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-400">Outflows (sides)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-400">Outcomes (bottom)</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
