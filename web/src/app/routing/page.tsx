'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'

const RoutingPage = dynamic(
  () => import('@/components/routing/RoutingPage'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading routing visualization...</span>
        </div>
      </div>
    ),
  }
)

export default function RoutingRoute() {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              &larr; Back
            </Link>
            <div className="h-4 w-px bg-gray-700" />
            <div>
              <h1 className="text-base font-semibold text-white">
                Commitment Routing
              </h1>
              <p className="text-xs text-gray-500">
                How commitments match to pools &mdash; scored by bioregion,
                need overlap, timeframe, and capacity
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <RoutingPage />
      </div>
    </div>
  )
}
