'use client'

import type { Commitment } from '@/hooks/useCommitments'
import type { RoutingPool, RoutingEdge } from '@/hooks/useRoutingOverview'

interface NodePanelProps {
  commitment: Commitment | null
  pool: RoutingPool | null
  connectedEdges: RoutingEdge[]
  onClose: () => void
}

const stateLabels: Record<string, { color: string; label: string }> = {
  PROPOSED: { color: 'text-yellow-400', label: 'Proposed' },
  VERIFIED: { color: 'text-emerald-400', label: 'Verified' },
  ACTIVE: { color: 'text-blue-400', label: 'Active' },
  REDEEMED: { color: 'text-purple-400', label: 'Redeemed' },
  WITHDRAWN: { color: 'text-red-400', label: 'Withdrawn' },
  EXPIRED: { color: 'text-gray-400', label: 'Expired' },
  forming: { color: 'text-amber-400', label: 'Forming' },
  active: { color: 'text-emerald-400', label: 'Active' },
}

export default function NodePanel({ commitment, pool, connectedEdges, onClose }: NodePanelProps) {
  if (!commitment && !pool) return null

  return (
    <div className="absolute top-0 right-0 z-20 w-80 h-full bg-gray-900 border-l border-gray-700 overflow-y-auto shadow-2xl">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 text-sm z-10"
      >
        ✕
      </button>

      {commitment && <CommitmentDetail commitment={commitment} connectedEdges={connectedEdges} />}
      {pool && <PoolDetail pool={pool} connectedEdges={connectedEdges} />}
    </div>
  )
}

function CommitmentDetail({ commitment, connectedEdges }: { commitment: Commitment; connectedEdges: RoutingEdge[] }) {
  const state = stateLabels[commitment.state] || { color: 'text-gray-400', label: commitment.state }
  const meta = commitment.metadata || {}

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Commitment</div>
        <h3 className="text-sm font-semibold text-gray-100 leading-snug">{commitment.title}</h3>
      </div>

      {/* State + type */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${state.color}`}>{state.label}</span>
        <span className="text-gray-600">|</span>
        <span className="text-xs text-gray-400">{commitment.offer_type}</span>
      </div>

      {/* Description */}
      {commitment.description && (
        <p className="text-xs text-gray-400 leading-relaxed">{commitment.description}</p>
      )}

      {/* Details */}
      <div className="space-y-2 text-xs">
        {commitment.quantity != null && (
          <Row label="Quantity" value={`${commitment.quantity} ${commitment.unit || ''}`} />
        )}
        {meta.estimated_value_usd != null && (
          <Row label="Est. Value" value={`$${meta.estimated_value_usd.toLocaleString()}`} />
        )}
        {commitment.pledger_uri && (
          <Row label="Pledger" value={commitment.pledger_uri.split('/').pop() || commitment.pledger_uri} />
        )}
        {meta.bioregion_uri && (
          <Row label="Bioregion" value={meta.bioregion_uri.split('/').pop() || meta.bioregion_uri} />
        )}
        {commitment.validity_start && (
          <Row label="Valid From" value={commitment.validity_start.slice(0, 10)} />
        )}
        {commitment.validity_end && (
          <Row label="Valid Until" value={commitment.validity_end.slice(0, 10)} />
        )}
        {commitment.pool_rid && (
          <Row label="Pledged To" value={commitment.pool_rid.split(':').pop() || commitment.pool_rid} />
        )}
      </div>

      {/* On-chain (Celo) */}
      {meta.mint_tx_hash && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">On-Chain (Celo)</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">VCV Minted</span>
              <span className="text-gray-300">{meta.minted_amount} VCV</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Mint TX</span>
              <a
                href={`https://celoscan.io/tx/${meta.mint_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-mono text-[10px]"
              >
                {meta.mint_tx_hash.slice(0, 8)}...{meta.mint_tx_hash.slice(-6)}
              </a>
            </div>
            {meta.token_address && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Token</span>
                <a
                  href={`https://celoscan.io/token/${meta.token_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono text-[10px]"
                >
                  {meta.token_address.slice(0, 8)}...{meta.token_address.slice(-6)}
                </a>
              </div>
            )}
            {meta.mint_block && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Block</span>
                <a
                  href={`https://celoscan.io/block/${meta.mint_block}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono text-[10px]"
                >
                  {meta.mint_block.toLocaleString()}
                </a>
              </div>
            )}
            {meta.minted_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Minted</span>
                <span className="text-gray-400 text-[10px]">
                  {new Date(meta.minted_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Routing tags */}
      {meta.routing_tags && meta.routing_tags.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Routing Tags</div>
          <div className="flex flex-wrap gap-1">
            {meta.routing_tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Connected routes */}
      {connectedEdges.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
            Routes ({connectedEdges.length})
          </div>
          <div className="space-y-1.5">
            {connectedEdges
              .sort((a, b) => b.total_score - a.total_score)
              .map((edge) => (
                <div
                  key={edge.pool_rid}
                  className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1.5"
                >
                  <span className="text-gray-300 truncate mr-2">{edge.pool_name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-mono text-gray-400">{edge.total_score}</span>
                    {edge.recommended && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t border-gray-800 pt-3 text-[10px] text-gray-600 space-y-0.5">
        <div>Created: {new Date(commitment.created_at).toLocaleDateString()}</div>
        <div>Updated: {new Date(commitment.updated_at).toLocaleDateString()}</div>
      </div>
    </div>
  )
}

function PoolDetail({ pool, connectedEdges }: { pool: RoutingPool; connectedEdges: RoutingEdge[] }) {
  const state = stateLabels[pool.state] || { color: 'text-gray-400', label: pool.state }
  const thresholdPct = Math.min(100, pool.threshold_pct_current)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="text-[10px] text-pink-400 uppercase tracking-wide mb-1">Pool</div>
        <h3 className="text-sm font-semibold text-gray-100 leading-snug">{pool.name}</h3>
      </div>

      {/* State */}
      <span className={`text-xs font-medium ${state.color}`}>{state.label}</span>

      {/* Details */}
      <div className="space-y-2 text-xs">
        <Row label="Pledges" value={`${pool.verified_pledges} verified / ${pool.total_pledges} total`} />
        <Row label="Threshold" value={`${thresholdPct.toFixed(0)}%`} />
        {pool.bioregion_uri && (
          <Row label="Bioregion" value={pool.bioregion_uri.split('/').pop() || pool.bioregion_uri} />
        )}
        {pool.capacity_usd != null && (
          <Row label="Capacity" value={`$${pool.capacity_usd.toLocaleString()}`} />
        )}
        {pool.remaining_capacity_usd != null && (
          <Row label="Remaining" value={`$${pool.remaining_capacity_usd.toLocaleString()}`} />
        )}
      </div>

      {/* Threshold bar */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Threshold Progress</div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${thresholdPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${thresholdPct}%` }}
          />
        </div>
        <div className="text-right text-[10px] text-gray-500 mt-0.5">{thresholdPct.toFixed(0)}%</div>
      </div>

      {/* Need tags */}
      {pool.need_tags.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Need Tags</div>
          <div className="flex flex-wrap gap-1">
            {pool.need_tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 bg-pink-900/30 text-pink-300 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Incoming commitments */}
      {connectedEdges.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
            Incoming Commitments ({connectedEdges.length})
          </div>
          <div className="space-y-1.5">
            {connectedEdges
              .sort((a, b) => b.total_score - a.total_score)
              .map((edge) => (
                <div
                  key={edge.commitment_rid}
                  className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1.5"
                >
                  <span className="text-gray-300 truncate mr-2">{edge.commitment_title}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-mono text-gray-400">{edge.total_score}</span>
                    {edge.recommended && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 text-right">{value}</span>
    </div>
  )
}
