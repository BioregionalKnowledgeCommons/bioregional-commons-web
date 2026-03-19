'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from 'react-force-graph-2d'
import { forceCollide, type ForceManyBody, type SimulationNodeDatum } from 'd3-force'
import type { RoutingOverviewResponse, RoutingEdge } from '@/hooks/useRoutingOverview'

const ROUTABLE_STATES = new Set(['PROPOSED', 'VERIFIED'])

const STATE_COLORS: Record<string, string> = {
  PROPOSED: '#eab308',
  VERIFIED: '#10b981',
  ACTIVE: '#3b82f6',
  REDEEMED: '#a855f7',
  WITHDRAWN: '#ef4444',
  EXPIRED: '#6b7280',
  forming: '#f59e0b',
  active: '#22c55e',
}

export interface GraphNode {
  id: string
  type: 'commitment' | 'pool'
  label: string
  state: string
  sublabel: string
  value: number
  routable: boolean
  pledgeInfo?: string
  thresholdPct?: number
}

interface GraphLink {
  source: string
  target: string
  score: number
  recommended: boolean
  hasExcludes: boolean
  routingEdge: RoutingEdge
}

interface RoutingCanvasProps {
  data: RoutingOverviewResponse
  onEdgeSelect: (edge: RoutingEdge | null) => void
  onNodeSelect: (nodeId: string | null) => void
}

function buildGraphData(data: RoutingOverviewResponse) {
  const nodes: GraphNode[] = []

  for (const c of data.commitments) {
    const routable = ROUTABLE_STATES.has(c.state)
    nodes.push({
      id: `c-${c.commitment_rid}`,
      type: 'commitment',
      label: c.title.length > 30 ? c.title.slice(0, 27) + '...' : c.title,
      state: c.state,
      sublabel: c.offer_type,
      value: routable ? 3 : 1.5,
      routable,
    })
  }

  for (const p of data.pools) {
    nodes.push({
      id: `p-${p.pool_rid}`,
      type: 'pool',
      label: p.name.length > 25 ? p.name.slice(0, 22) + '...' : p.name,
      state: p.state,
      sublabel: p.need_tags.slice(0, 2).join(', '),
      value: 8,
      routable: true,
      pledgeInfo: `${p.verified_pledges}/${p.total_pledges} verified`,
      thresholdPct: Math.min(100, p.threshold_pct_current),
    })
  }

  const links: GraphLink[] = data.routingEdges.map((re) => ({
    source: `c-${re.commitment_rid}`,
    target: `p-${re.pool_rid}`,
    score: re.total_score,
    recommended: re.recommended,
    hasExcludes: re.hard_excludes.length > 0,
    routingEdge: re,
  }))

  return { nodes, links }
}

export default function RoutingCanvas({ data, onEdgeSelect, onNodeSelect }: RoutingCanvasProps) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)

  const dataKey = `${data.commitments.length}:${data.pools.length}:${data.routingEdges.length}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const graphData = useMemo(() => buildGraphData(data), [dataKey])

  // Resize to fill container
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Configure forces
  useEffect(() => {
    const fg = fgRef.current
    if (!fg || !graphData.nodes.length) return

    ;(fg.d3Force('charge') as ForceManyBody<GraphNode & SimulationNodeDatum>)
      ?.strength((n) => (n.type === 'pool' ? -1200 : -300))

    fg.d3Force('collide', forceCollide<GraphNode & SimulationNodeDatum>()
      .radius((n) => (n.type === 'pool' ? 55 : 70))
      .strength(1)
      .iterations(3)
    )

    fg.d3ReheatSimulation()
  }, [graphData.nodes.length])

  const handleNodeHover = useCallback((node: NodeObject<GraphNode> | null) => {
    setHoveredNode(node)
  }, [])

  const handleNodeClick = useCallback(
    (node: NodeObject<GraphNode>) => {
      onNodeSelect(node.id)
    },
    [onNodeSelect]
  )

  const handleLinkClick = useCallback(
    (link: LinkObject<GraphNode, GraphLink>) => {
      onEdgeSelect(link.routingEdge ?? null)
    },
    [onEdgeSelect]
  )

  const handleBackgroundClick = useCallback(() => {
    onEdgeSelect(null)
    onNodeSelect(null)
  }, [onEdgeSelect, onNodeSelect])

  // Custom node renderer
  const paintNode = useCallback(
    (node: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const isPool = node.type === 'pool'

      ctx.globalAlpha = node.routable ? 1 : 0.35

      if (isPool) {
        // --- POOL: Circle with gradient border ---
        const radius = 40
        const stateColor = STATE_COLORS[node.state] || '#6b7280'

        // Outer glow ring
        ctx.beginPath()
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2)
        ctx.fillStyle = stateColor
        ctx.globalAlpha = (node.routable ? 1 : 0.35) * 0.4
        ctx.fill()
        ctx.globalAlpha = node.routable ? 1 : 0.35

        // Circle background
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = '#1e1b4b'
        ctx.fill()
        ctx.strokeStyle = stateColor
        ctx.lineWidth = 2
        ctx.stroke()

        // Pool icon (small diamond)
        ctx.fillStyle = stateColor
        ctx.beginPath()
        ctx.moveTo(x, y - 18)
        ctx.lineTo(x + 6, y - 12)
        ctx.lineTo(x, y - 6)
        ctx.lineTo(x - 6, y - 12)
        ctx.closePath()
        ctx.fill()

        // Label (centered)
        ctx.fillStyle = '#e5e7eb'
        ctx.font = 'bold 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(node.label, x, y - 2, radius * 2 - 10)

        // Sublabel
        if (node.sublabel) {
          ctx.fillStyle = '#9ca3af'
          ctx.font = '7px Inter, system-ui, sans-serif'
          ctx.fillText(node.sublabel, x, y + 10, radius * 2 - 10)
        }

        // Pledge info
        if (node.pledgeInfo) {
          ctx.fillStyle = '#6b7280'
          ctx.font = '7px Inter, system-ui, sans-serif'
          ctx.fillText(node.pledgeInfo, x, y + 20, radius * 2 - 10)
        }

        // Threshold arc
        if (node.thresholdPct != null) {
          const pct = node.thresholdPct / 100
          const startAngle = -Math.PI / 2
          const endAngle = startAngle + Math.PI * 2 * pct

          ctx.beginPath()
          ctx.arc(x, y, radius - 4, startAngle, endAngle)
          ctx.strokeStyle = pct >= 1 ? '#22c55e' : '#f59e0b'
          ctx.lineWidth = 2.5
          ctx.lineCap = 'round'
          ctx.stroke()
          ctx.lineCap = 'butt'
        }
      } else {
        // --- COMMITMENT: Rounded rectangle ---
        const w = 120
        const h = 40
        const r = 6
        const stateColor = STATE_COLORS[node.state] || '#6b7280'

        // Card background
        ctx.fillStyle = '#1f2937'
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(x - w / 2, y - h / 2, w, h, r)
        ctx.fill()
        ctx.stroke()

        // State color accent (left edge)
        ctx.fillStyle = stateColor
        ctx.beginPath()
        ctx.roundRect(x - w / 2, y - h / 2, 4, h, [r, 0, 0, r])
        ctx.fill()

        // Label
        ctx.fillStyle = '#e5e7eb'
        ctx.font = 'bold 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(node.label, x - w / 2 + 10, y - h / 2 + 7, w - 16)

        // Sublabel
        ctx.fillStyle = '#9ca3af'
        ctx.font = '8px Inter, system-ui, sans-serif'
        ctx.fillText(node.sublabel || '', x - w / 2 + 10, y - h / 2 + 20, w - 16)
      }

      ctx.globalAlpha = 1
    },
    []
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkNodeId = (endpoint: any): string =>
    typeof endpoint === 'object' && endpoint !== null ? endpoint.id : String(endpoint)

  const linkColor = useCallback(
    (link: LinkObject<GraphNode, GraphLink>) => {
      if (hoveredNode) {
        const src = linkNodeId(link.source)
        const tgt = linkNodeId(link.target)
        if (src === hoveredNode.id || tgt === hoveredNode.id) {
          return link.recommended ? '#22c55e' : link.hasExcludes ? '#f59e0b' : '#9ca3af'
        }
        return 'rgba(55, 65, 81, 0.2)'
      }
      if (link.recommended) return '#22c55e'
      if (link.hasExcludes) return '#f59e0b'
      return 'rgba(107, 114, 128, 0.5)'
    },
    [hoveredNode]
  )

  const linkWidth = useCallback(
    (link: LinkObject<GraphNode, GraphLink>) => {
      if (hoveredNode) {
        const src = linkNodeId(link.source)
        const tgt = linkNodeId(link.target)
        if (src === hoveredNode.id || tgt === hoveredNode.id) {
          return 1 + (link.score / 100) * 3
        }
        return 0.3
      }
      return 0.5 + (link.score / 100) * 2
    },
    [hoveredNode]
  )

  const nodePointerArea = useCallback(
    (node: NodeObject<GraphNode>, color: string, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      ctx.fillStyle = color
      if (node.type === 'pool') {
        ctx.beginPath()
        ctx.arc(x, y, 43, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(x - 60, y - 20, 120, 40)
      }
    },
    []
  )

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gray-950">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={size.width}
        height={size.height}
        backgroundColor="#030712"
        nodeVal={(node) => node.value}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={nodePointerArea}
        enableNodeDrag={true}
        linkWidth={linkWidth}
        linkColor={linkColor}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.95}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onBackgroundClick={handleBackgroundClick}
        linkCurvature={0.15}
        cooldownTicks={60}
        warmupTicks={30}
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.3}
      />

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg p-3 text-[10px] space-y-2">
        <div className="text-gray-500 uppercase tracking-wide font-medium">Node Types</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-pink-500 bg-indigo-950" />
          <span className="text-gray-400">Pool</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm bg-gray-800 border border-gray-600" />
          <span className="text-gray-400">Commitment</span>
        </div>
        <div className="text-gray-500 uppercase tracking-wide font-medium mt-1">Edges</div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-emerald-500" />
          <span className="text-gray-400">Recommended</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-amber-500" />
          <span className="text-gray-400">Has excludes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-gray-500" />
          <span className="text-gray-400">Scored match</span>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-2 right-2 z-10 text-[10px] text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
        {data.commitments.length} commitments &middot; {data.pools.length} pools &middot; {data.routingEdges.length} routes
      </div>
    </div>
  )
}
