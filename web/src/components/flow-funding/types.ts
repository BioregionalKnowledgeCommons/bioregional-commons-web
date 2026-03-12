// Vendored from Jeff-Emmett/flow-funding (BioregionalKnowledgeCommons/flow-funding fork)
// Modified for BKC integration: added SettlementSnapshot, claim state types

import type { Node, Edge } from '@xyflow/react'

// Overflow allocation - funds flowing to OTHER FUNNELS when above max threshold
export interface OverflowAllocation {
  targetId: string
  percentage: number // 0-100
  color: string
}

// Spending allocation - funds flowing DOWN to OUTCOMES/OUTPUTS
export interface SpendingAllocation {
  targetId: string
  percentage: number // 0-100
  color: string
}

export interface FunnelNodeData {
  label: string
  currentValue: number
  minThreshold: number
  maxThreshold: number
  maxCapacity: number
  inflowRate: number
  // Overflow goes SIDEWAYS to other funnels
  overflowAllocations: OverflowAllocation[]
  // Spending goes DOWN to outcomes/outputs
  spendingAllocations: SpendingAllocation[]
  [key: string]: unknown
}

export interface OutcomeNodeData {
  label: string
  description?: string
  fundingReceived: number
  fundingTarget: number
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked'
  // BKC extensions
  claimState?: ClaimState
  claimRid?: string
  proofPackUrl?: string
  [key: string]: unknown
}

export type FlowNode = Node<FunnelNodeData | OutcomeNodeData>

export interface FlowEdgeData {
  allocation: number // percentage 0-100
  color: string
  edgeType: 'overflow' | 'spending' // overflow = sideways, spending = downward
  [key: string]: unknown
}

export type FlowEdge = Edge<FlowEdgeData>

// BKC-specific types

export type ClaimState = 'self_reported' | 'peer_reviewed' | 'verified' | 'ledger_anchored' | 'withdrawn'

export type ThresholdBand = 'auto' | 'semi' | 'manual'

export interface SettlementParticipant {
  participant_name: string
  participant_uri?: string | null
  initial_balance: number
  final_balance: number
  threshold: number
}

export interface SettlementSnapshot {
  settlement_id: string
  tx_hash?: string
  iterations: number
  converged: boolean
  total_redistributed_usd: number
  participant_count: number
  node_balances: SettlementParticipant[] | null
  threshold_band?: ThresholdBand
  claim_rid?: string
  claim_state?: ClaimState
  evidence_uri?: string
  receipt_id?: string
  created_at?: string
}
