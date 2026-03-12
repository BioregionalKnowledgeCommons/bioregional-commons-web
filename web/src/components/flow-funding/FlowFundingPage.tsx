// Client wrapper: data fetching + mode switching for flow-funding visualization
'use client'

import { useState, useMemo } from 'react'
import { useSettlements } from '@/hooks/useSettlements'
import type { FlowNode, FunnelNodeData, OutcomeNodeData, SettlementSnapshot } from './types'
import type { FlowCanvasProps } from './FlowCanvas'

const SPENDING_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#6366f1']

function settlementToNodes(settlements: SettlementSnapshot[]): FlowNode[] {
  if (!settlements.length) return []

  // Collect all unique participants across settlements
  const participantMap = new Map<string, { name: string; uri?: string | null; totalIn: number; totalOut: number }>()

  for (const s of settlements) {
    if (!s.node_balances) continue
    for (const nb of s.node_balances) {
      const key = nb.participant_uri || nb.participant_name
      const existing = participantMap.get(key)
      if (existing) {
        existing.totalIn += nb.initial_balance
        existing.totalOut += nb.final_balance
      } else {
        participantMap.set(key, {
          name: nb.participant_name,
          uri: nb.participant_uri,
          totalIn: nb.initial_balance,
          totalOut: nb.final_balance,
        })
      }
    }
  }

  const nodes: FlowNode[] = []
  let x = 50

  // Create funnel nodes for each participant
  for (const [key, p] of participantMap) {
    const id = key.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    nodes.push({
      id,
      type: 'funnel',
      position: { x, y: 100 },
      data: {
        label: p.name,
        currentValue: p.totalOut,
        minThreshold: 100,
        maxThreshold: 500,
        maxCapacity: Math.max(1000, p.totalIn * 2),
        inflowRate: 0,
        overflowAllocations: [],
        spendingAllocations: [],
      } as FunnelNodeData,
    })
    x += 250
  }

  // Create outcome nodes from settlement claims
  const seenClaims = new Set<string>()
  let ox = 150
  for (const s of settlements) {
    if (!s.claim_rid || seenClaims.has(s.claim_rid)) continue
    seenClaims.add(s.claim_rid)

    nodes.push({
      id: `claim-${s.claim_rid}`,
      type: 'outcome',
      position: { x: ox, y: 400 },
      data: {
        label: s.claim_statement?.slice(0, 40) || `Settlement ${s.settlement_id}`,
        description: s.claim_statement,
        fundingReceived: s.total_redistributed_usd,
        fundingTarget: s.total_redistributed_usd * 2,
        status: s.claim_state === 'verified' || s.claim_state === 'ledger_anchored' ? 'completed' : 'in-progress',
        claimState: s.claim_state,
        claimRid: s.claim_rid,
      } as OutcomeNodeData,
    })
    ox += 280
  }

  return nodes
}

export type FlowMode = 'simulate' | 'live'

interface FlowFundingPageProps {
  FlowCanvas: React.ComponentType<FlowCanvasProps>
}

export default function FlowFundingPage({ FlowCanvas }: FlowFundingPageProps) {
  const [mode, setMode] = useState<FlowMode>('simulate')
  const { data: settlementsData, isLoading, error } = useSettlements('octo-salish-sea')

  const liveNodes = useMemo(() => {
    if (!settlementsData?.settlements) return undefined
    const nodes = settlementToNodes(settlementsData.settlements)
    return nodes.length > 0 ? nodes : undefined
  }, [settlementsData])

  const hasLiveData = !!liveNodes && liveNodes.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 border-b border-gray-800/50 flex-shrink-0">
        <span className="text-xs text-gray-500 mr-2">Mode:</span>
        <button
          onClick={() => setMode('simulate')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            mode === 'simulate'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          Demo
        </button>
        <button
          onClick={() => setMode('live')}
          disabled={!hasLiveData}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            mode === 'live'
              ? 'bg-blue-600 text-white'
              : hasLiveData
                ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          Live
          {isLoading && <span className="ml-1 text-gray-500">...</span>}
        </button>
        {mode === 'live' && settlementsData && (
          <span className="text-[10px] text-gray-500 ml-2">
            {settlementsData.settlements.length} settlement{settlementsData.settlements.length !== 1 ? 's' : ''}
          </span>
        )}
        {error && (
          <span className="text-[10px] text-red-400 ml-2">Failed to load live data</span>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <FlowCanvas
          initialNodes={mode === 'live' ? liveNodes : undefined}
          mode={mode === 'live' ? 'live' : 'simulate'}
        />
      </div>
    </div>
  )
}
