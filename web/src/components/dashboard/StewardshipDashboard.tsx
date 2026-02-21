'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NodeEntry } from '@/types';
import { DOMAIN_COLORS } from '@/types';

interface DashboardProps {
  node: NodeEntry;
  onClose: () => void;
}

// Mock data for demonstration
const MOCK_STATS = {
  vault: {
    total_files: 47,
    total_chunks: 312,
    last_indexed: '2024-02-10T14:30:00Z',
    categories: [
      { name: 'Governance', count: 15, percentage: 32 },
      { name: 'Ecology', count: 12, percentage: 26 },
      { name: 'Practice', count: 10, percentage: 21 },
      { name: 'Community', count: 10, percentage: 21 },
    ],
  },
  queries: {
    total_24h: 23,
    total_7d: 156,
    avg_confidence: 0.82,
    top_topics: ['water rights', 'drought management', 'prior appropriation'],
    unanswered: 3,
  },
  federation: {
    connected_nodes: 4,
    queries_sent: 47,
    queries_received: 23,
    active_bridges: 2,
  },
  contributions: {
    pending: 2,
    approved_this_month: 8,
    contributors: 5,
  },
};

const MOCK_PENDING = [
  {
    id: 'contrib-1',
    title: 'Water Allocation Agreement 2024',
    author: 'river-steward',
    category: 'governance',
    submitted: '2024-02-09',
  },
  {
    id: 'contrib-2',
    title: 'Riparian Zone Survey Results',
    author: 'field-observer',
    category: 'ecology',
    submitted: '2024-02-08',
  },
];

const MOCK_QUERIES = [
  { query: 'How does prior appropriation work?', count: 12, confidence: 0.89 },
  { query: 'What are the drought contingency plans?', count: 8, confidence: 0.76 },
  { query: 'Who maintains the watershed councils?', count: 6, confidence: 0.45 },
];

export default function StewardshipDashboard({ node, onClose }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'queries' | 'federation' | 'contributions'>('overview');
  const domainColor = DOMAIN_COLORS[node.thematic_domain];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'vault', label: 'Vault', icon: '📚' },
    { id: 'queries', label: 'Queries', icon: '💬' },
    { id: 'federation', label: 'Federation', icon: '🌐' },
    { id: 'contributions', label: 'Contributions', icon: '✏️' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25 }}
        className="relative w-[900px] max-w-[95vw] h-[700px] max-h-[90vh] bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/40 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/30 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${domainColor}20` }}
              >
                <span className="text-lg">🌿</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{node.display_name}</h2>
                <p className="text-xs text-gray-400">Stewardship Dashboard</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dashboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-gray-700/20 flex gap-1 shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gray-800/80 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <TabContent key="overview">
                <OverviewTab domainColor={domainColor} />
              </TabContent>
            )}
            {activeTab === 'vault' && (
              <TabContent key="vault">
                <VaultTab domainColor={domainColor} />
              </TabContent>
            )}
            {activeTab === 'queries' && (
              <TabContent key="queries">
                <QueriesTab domainColor={domainColor} />
              </TabContent>
            )}
            {activeTab === 'federation' && (
              <TabContent key="federation">
                <FederationTab domainColor={domainColor} />
              </TabContent>
            )}
            {activeTab === 'contributions' && (
              <TabContent key="contributions">
                <ContributionsTab domainColor={domainColor} />
              </TabContent>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TabContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────
function OverviewTab({ domainColor }: { domainColor: string }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Vault Files"
          value={MOCK_STATS.vault.total_files}
          subtext={`${MOCK_STATS.vault.total_chunks} chunks indexed`}
          color={domainColor}
        />
        <MetricCard
          label="Queries (7d)"
          value={MOCK_STATS.queries.total_7d}
          subtext={`${MOCK_STATS.queries.total_24h} today`}
          color="#3B82F6"
        />
        <MetricCard
          label="Avg Confidence"
          value={`${Math.round(MOCK_STATS.queries.avg_confidence * 100)}%`}
          subtext="Query response quality"
          color="#10B981"
        />
        <MetricCard
          label="Federation"
          value={MOCK_STATS.federation.connected_nodes}
          subtext="Connected nodes"
          color="#8B5CF6"
        />
      </div>

      {/* Action Items */}
      {MOCK_STATS.queries.unanswered > 0 || MOCK_STATS.contributions.pending > 0 ? (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <span>⚠️</span> Action Items
          </h3>
          <div className="space-y-2">
            {MOCK_STATS.queries.unanswered > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{MOCK_STATS.queries.unanswered} low-confidence queries need content</span>
                <button className="text-yellow-400 hover:text-yellow-300 text-xs cursor-pointer">View →</button>
              </div>
            )}
            {MOCK_STATS.contributions.pending > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{MOCK_STATS.contributions.pending} contributions pending review</span>
                <button className="text-yellow-400 hover:text-yellow-300 text-xs cursor-pointer">Review →</button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Topics */}
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Query Topics</h3>
          <div className="space-y-3">
            {MOCK_QUERIES.map((q, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 truncate flex-1 mr-4">{q.query}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">{q.count}×</span>
                  <ConfidenceBadge confidence={q.confidence} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vault Categories */}
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Vault Categories</h3>
          <div className="space-y-3">
            {MOCK_STATS.vault.categories.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-400">{cat.name}</span>
                  <span className="text-gray-500">{cat.count} files</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: domainColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vault Tab ───────────────────────────────────────────────────────
function VaultTab({ domainColor }: { domainColor: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Knowledge Vault</h3>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style={{ backgroundColor: `${domainColor}20`, color: domainColor }}
        >
          Re-index Vault
        </button>
      </div>

      {/* Vault Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4">
          <span className="text-2xl font-bold text-white">{MOCK_STATS.vault.total_files}</span>
          <p className="text-xs text-gray-400 mt-1">Total Files</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4">
          <span className="text-2xl font-bold text-white">{MOCK_STATS.vault.total_chunks}</span>
          <p className="text-xs text-gray-400 mt-1">Indexed Chunks</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4">
          <span className="text-2xl font-bold text-white">
            {new Date(MOCK_STATS.vault.last_indexed).toLocaleDateString()}
          </span>
          <p className="text-xs text-gray-400 mt-1">Last Indexed</p>
        </div>
      </div>

      {/* File Tree Preview */}
      <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Vault Structure</h4>
        <div className="font-mono text-sm space-y-1.5">
          <FileTreeItem name="governance/" count={15} />
          <FileTreeItem name="  water-rights.md" isFile />
          <FileTreeItem name="  colorado-river-compact.md" isFile />
          <FileTreeItem name="  ...12 more" isMore />
          <FileTreeItem name="ecology/" count={12} />
          <FileTreeItem name="  species/" count={5} />
          <FileTreeItem name="  watersheds/" count={7} />
          <FileTreeItem name="practice/" count={10} />
          <FileTreeItem name="community/" count={10} />
        </div>
      </div>
    </div>
  );
}

function FileTreeItem({ name, count, isFile, isMore }: { name: string; count?: number; isFile?: boolean; isMore?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${isMore ? 'text-gray-600' : isFile ? 'text-gray-400' : 'text-gray-300'}`}>
      {!isFile && !isMore && <span className="text-gray-600">📁</span>}
      {isFile && <span className="text-gray-600">📄</span>}
      <span>{name}</span>
      {count !== undefined && <span className="text-gray-600 text-xs">({count})</span>}
    </div>
  );
}

// ─── Queries Tab ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function QueriesTab(_props: { domainColor: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Query Analytics</h3>
        <select className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-gray-300">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>All time</option>
        </select>
      </div>

      {/* Query Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-white">{MOCK_STATS.queries.total_7d}</span>
          <p className="text-xs text-gray-400 mt-1">Total Queries</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-green-400">{Math.round(MOCK_STATS.queries.avg_confidence * 100)}%</span>
          <p className="text-xs text-gray-400 mt-1">Avg Confidence</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-yellow-400">{MOCK_STATS.queries.unanswered}</span>
          <p className="text-xs text-gray-400 mt-1">Low Confidence</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-blue-400">{MOCK_STATS.queries.top_topics.length}</span>
          <p className="text-xs text-gray-400 mt-1">Popular Topics</p>
        </div>
      </div>

      {/* Query List */}
      <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Recent Queries</h4>
        <div className="space-y-3">
          {MOCK_QUERIES.map((q, i) => (
            <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/20">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm text-gray-200 mb-1">{q.query}</p>
                <p className="text-xs text-gray-500">Asked {q.count} times</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <ConfidenceBadge confidence={q.confidence} />
                {q.confidence < 0.6 && (
                  <button
                    className="text-[10px] px-2 py-1 rounded text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 cursor-pointer"
                  >
                    Add Content
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Federation Tab ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FederationTab(_props: { domainColor: string }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Federation Network</h3>

      {/* Federation Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-white">{MOCK_STATS.federation.connected_nodes}</span>
          <p className="text-xs text-gray-400 mt-1">Connected Nodes</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-blue-400">{MOCK_STATS.federation.queries_sent}</span>
          <p className="text-xs text-gray-400 mt-1">Queries Sent</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-green-400">{MOCK_STATS.federation.queries_received}</span>
          <p className="text-xs text-gray-400 mt-1">Queries Received</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-purple-400">{MOCK_STATS.federation.active_bridges}</span>
          <p className="text-xs text-gray-400 mt-1">Active Bridges</p>
        </div>
      </div>

      {/* Connected Nodes */}
      <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Connected Nodes</h4>
        <div className="space-y-3">
          {['Sierra Nevada Water Systems', 'Cascadia Bioregional Governance', 'Great Basin Ecology Network', 'Southwest Watershed Council'].map((name, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-200">{name}</span>
              </div>
              <span className="text-xs text-gray-500">Bridge active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Contributions Tab ───────────────────────────────────────────────
function ContributionsTab({ domainColor }: { domainColor: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Pending Contributions</h3>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
          {MOCK_PENDING.length} pending
        </span>
      </div>

      {/* Contribution Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-yellow-400">{MOCK_STATS.contributions.pending}</span>
          <p className="text-xs text-gray-400 mt-1">Pending Review</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-green-400">{MOCK_STATS.contributions.approved_this_month}</span>
          <p className="text-xs text-gray-400 mt-1">Approved This Month</p>
        </div>
        <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-4 text-center">
          <span className="text-2xl font-bold text-blue-400">{MOCK_STATS.contributions.contributors}</span>
          <p className="text-xs text-gray-400 mt-1">Active Contributors</p>
        </div>
      </div>

      {/* Pending List */}
      <div className="rounded-xl border border-gray-700/30 bg-gray-800/30 p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Review Queue</h4>
        <div className="space-y-3">
          {MOCK_PENDING.map((contrib) => (
            <div key={contrib.id} className="flex items-start justify-between p-4 rounded-lg bg-gray-800/40 border border-gray-700/20">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-gray-200 mb-1">{contrib.title}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>by @{contrib.author}</span>
                  <span>•</span>
                  <span>{contrib.submitted}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: `${domainColor}15`,
                      color: domainColor,
                    }}
                  >
                    {contrib.category}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 transition-colors cursor-pointer">
                  Approve
                </button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700/40 text-gray-400 border border-gray-600/30 hover:text-gray-200 transition-colors cursor-pointer">
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────
function MetricCard({ label, value, subtext, color }: { label: string; value: string | number; subtext: string; color: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: `${color}25`,
        backgroundColor: `${color}05`,
      }}
    >
      <span className="text-2xl font-bold text-white">{value}</span>
      <p className="text-xs font-medium mt-1" style={{ color }}>{label}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{subtext}</p>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let color = '#10B981'; // Green
  if (confidence < 0.6) color = '#EF4444'; // Red
  else if (confidence < 0.8) color = '#F59E0B'; // Yellow

  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}25`,
      }}
    >
      {pct}%
    </span>
  );
}
