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

// Colors
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

interface GraphNode {
  id: string
  type: 'commitment' | 'pool'
  label: string
  state: string
  sublabel: string
  value: number // controls node size
  routable: boolean
  // pool-specific
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
      label: p.name.length > 30 ? p.name.slice(0, 27) + '...' : p.name,
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

export default function RoutingCanvas({ data, onEdgeSelect }: RoutingCanvasProps) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)

  // Stable key: only rebuild graph when data actually changes
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

  // Configure forces — cards are ~140x52 (pool) and ~120x40 (commitment)
  // so we need large collision radii to prevent overlap
  useEffect(() => {
    const fg = fgRef.current
    if (!fg || !graphData.nodes.length) return

    ;(fg.d3Force('charge') as ForceManyBody<GraphNode & SimulationNodeDatum>)
      ?.strength((n) => (n.type === 'pool' ? -1200 : -300))

    // Add collision force sized to card dimensions
    fg.d3Force('collide', forceCollide<GraphNode & SimulationNodeDatum>()
      .radius((n) => (n.type === 'pool' ? 85 : 70))
      .strength(1)
      .iterations(3)
    )

    fg.d3ReheatSimulation()
  }, [graphData.nodes.length])

  const handleNodeHover = useCallback((node: NodeObject<GraphNode> | null) => {
    setHoveredNode(node)
  }, [])

  const handleLinkClick = useCallback(
    (link: LinkObject<GraphNode, GraphLink>) => {
      onEdgeSelect(link.routingEdge ?? null)
    },
    [onEdgeSelect]
  )

  const handleBackgroundClick = useCallback(() => {
    onEdgeSelect(null)
  }, [onEdgeSelect])

  // Custom node renderer
  const paintNode = useCallback(
    (node: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const isPool = node.type === 'pool'
      const w = isPool ? 140 : 120
      const h = isPool ? 52 : 40
      const r = 6

      // Dimmed if not routable
      ctx.globalAlpha = node.routable ? 1 : 0.35

      // Card background
      ctx.fillStyle = '#1f2937'
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, w, h, r)
      ctx.fill()
      ctx.stroke()

      // State color accent (left edge)
      const stateColor = STATE_COLORS[node.state] || '#6b7280'
      ctx.fillStyle = stateColor
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, 4, h, [r, 0, 0, r])
      ctx.fill()

      // Label
      ctx.fillStyle = '#e5e7eb'
      ctx.font = `bold ${isPool ? 11 : 10}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(node.label, x - w / 2 + 10, y - h / 2 + 6, w - 16)

      // Sublabel
      ctx.fillStyle = '#9ca3af'
      ctx.font = `${isPool ? 9 : 8}px Inter, system-ui, sans-serif`
      ctx.fillText(node.sublabel || '', x - w / 2 + 10, y - h / 2 + (isPool ? 20 : 18), w - 16)

      // Pool-specific: pledge info + threshold bar
      if (isPool && node.pledgeInfo) {
        ctx.fillStyle = '#6b7280'
        ctx.font = '8px Inter, system-ui, sans-serif'
        ctx.fillText(node.pledgeInfo, x - w / 2 + 10, y - h / 2 + 32, w - 16)

        // Threshold bar
        const barX = x - w / 2 + 10
        const barY = y - h / 2 + 43
        const barW = w - 20
        const barH = 3
        const pct = (node.thresholdPct ?? 0) / 100

        ctx.fillStyle = '#374151'
        ctx.beginPath()
        ctx.roundRect(barX, barY, barW, barH, 1.5)
        ctx.fill()

        ctx.fillStyle = pct >= 1 ? '#22c55e' : '#f59e0b'
        ctx.beginPath()
        ctx.roundRect(barX, barY, barW * pct, barH, 1.5)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    },
    []
  )

  // Extract node ID from link endpoint (d3 resolves string → object at runtime)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkNodeId = (endpoint: any): string =>
    typeof endpoint === 'object' && endpoint !== null ? endpoint.id : String(endpoint)

  // Custom link color
  const linkColor = useCallback(
    (link: LinkObject<GraphNode, GraphLink>) => {
      // Highlight links connected to hovered node
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

  // Node bounding area for pointer detection
  const nodePointerArea = useCallback(
    (node: NodeObject<GraphNode>, color: string, ctx: CanvasRenderingContext2D) => {
      const isPool = node.type === 'pool'
      const w = isPool ? 140 : 120
      const h = isPool ? 52 : 40
      ctx.fillStyle = color
      ctx.fillRect((node.x ?? 0) - w / 2, (node.y ?? 0) - h / 2, w, h)
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
        onLinkClick={handleLinkClick}
        onBackgroundClick={handleBackgroundClick}
        linkCurvature={0.15}
        cooldownTicks={60}
        warmupTicks={30}
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.3}
      />

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg p-3 text-[10px] space-y-1.5">
        <div className="text-gray-500 uppercase tracking-wide font-medium mb-1">Routing</div>
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
        <div className="text-gray-600 mt-1 pt-1 border-t border-gray-800">
          Click edge for score breakdown
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-2 right-2 z-10 text-[10px] text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
        {data.commitments.length} commitments &middot; {data.pools.length} pools &middot; {data.routingEdges.length} routes
      </div>
    </div>
  )
}
