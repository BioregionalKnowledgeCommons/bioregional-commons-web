/**
 * federation skill - Agent-to-agent query routing
 *
 * Enables federated knowledge access across the bioregional network.
 */

import * as fs from 'fs/promises';

interface PeerNode {
  node_id: string;
  display_name: string;
  bioregion_codes: string[];
  thematic_domain: string;
  agent_endpoint: string | null;
  bridges: string[];
  status: 'online' | 'offline' | 'unknown';
}

interface FederatedResult {
  node_id: string;
  node_name: string;
  response: string;
  confidence: number;
  sources: Array<{ path: string; section?: string }>;
  bridge_used?: string;
  translations_applied?: Array<{ original: string; translated: string }>;
}

interface FederationStats {
  queries_sent: number;
  queries_received: number;
  avg_response_time_ms: number;
  most_queried_peers: string[];
  most_used_bridges: string[];
}

// Registry cache
let registryCache: PeerNode[] | null = null;
let registryCacheTime = 0;
const REGISTRY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Route a query to peer nodes in the network
 */
export async function federated_query(params: {
  query: string;
  target_nodes?: string[];
  max_peers?: number;
  use_bridges?: boolean;
  timeout_ms?: number;
}): Promise<{
  local_results: unknown[];
  federated_results: FederatedResult[];
  synthesis: string;
  attribution: string;
}> {
  const {
    query,
    target_nodes,
    max_peers = 3,
    use_bridges = true,
    timeout_ms = 10000,
  } = params;

  const nodeId = process.env.NODE_ID;
  if (!nodeId) {
    throw new Error('NODE_ID not configured');
  }

  // Check if federation is enabled
  if (process.env.FEDERATION_ENABLED === 'false') {
    return {
      local_results: [],
      federated_results: [],
      synthesis: 'Federation is disabled for this node.',
      attribution: '',
    };
  }

  // Get local results first (would call vault-rag)
  const localResults: unknown[] = [];

  // Get peers
  const allPeers = await listPeersInternal();
  let selectedPeers: PeerNode[];

  if (target_nodes && target_nodes.length > 0) {
    selectedPeers = allPeers.filter((p) => target_nodes.includes(p.node_id));
  } else {
    selectedPeers = selectPeers(allPeers, query, max_peers);
  }

  // Query peers in parallel
  const federatedResults: FederatedResult[] = [];
  const queryPromises = selectedPeers.map(async (peer) => {
    if (!peer.agent_endpoint) {
      return null;
    }

    try {
      const result = await queryPeer(peer, query, use_bridges, timeout_ms);
      return result;
    } catch (error) {
      console.error(`Federation query to ${peer.node_id} failed:`, error);
      return null;
    }
  });

  const results = await Promise.all(queryPromises);
  for (const result of results) {
    if (result) {
      federatedResults.push(result);
    }
  }

  // Update stats
  await updateStats('query_sent', federatedResults.length);

  // Synthesize response
  const synthesis = synthesizeResponse(query, localResults, federatedResults);
  const attribution = generateAttribution(nodeId, federatedResults);

  return {
    local_results: localResults,
    federated_results: federatedResults,
    synthesis,
    attribution,
  };
}

/**
 * Get available peer nodes for federation
 */
export async function list_peers(): Promise<{ peers: PeerNode[] }> {
  const peers = await listPeersInternal();
  return { peers };
}

/**
 * Handle an incoming federated query from a peer
 */
export async function receive_query(params: {
  query_id: string;
  source_node_id: string;
  query_text: string;
  translated_query_text?: string;
  bridge_id?: string;
  max_response_tokens?: number;
}): Promise<{
  query_id: string;
  responding_node_id: string;
  response_text: string;
  confidence: number;
  translation_notes: Array<{ original: string; translated: string }>;
  source_documents: Array<{ path: string; section?: string }>;
}> {
  const {
    query_id,
    source_node_id,
    query_text,
    translated_query_text,
    bridge_id,
    max_response_tokens = 500,
  } = params;

  const nodeId = process.env.NODE_ID;
  if (!nodeId) {
    throw new Error('NODE_ID not configured');
  }

  // Use translated query if available
  const searchQuery = translated_query_text || query_text;

  // Search local vault (would use vault-rag)
  // For now, return placeholder
  const response_text = `[Response from ${nodeId} for query: "${searchQuery}"]`;
  const confidence = 0.7;
  const source_documents: Array<{ path: string; section?: string }> = [];
  const translation_notes: Array<{ original: string; translated: string }> = [];

  // Update stats
  await updateStats('query_received', 1);

  return {
    query_id,
    responding_node_id: nodeId,
    response_text,
    confidence,
    translation_notes,
    source_documents,
  };
}

/**
 * Get statistics about federation activity
 */
export async function get_federation_stats(): Promise<FederationStats> {
  const statsPath = '/workspace/memory/federation-stats.json';
  try {
    const content = await fs.readFile(statsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      queries_sent: 0,
      queries_received: 0,
      avg_response_time_ms: 0,
      most_queried_peers: [],
      most_used_bridges: [],
    };
  }
}

// Internal helper functions

async function listPeersInternal(): Promise<PeerNode[]> {
  // Check cache
  if (registryCache && Date.now() - registryCacheTime < REGISTRY_CACHE_TTL) {
    return registryCache;
  }

  // Fetch from registry
  const registryUrl =
    process.env.REGISTRY_URL ||
    'https://raw.githubusercontent.com/opencivics/index-registry/main/registry.json';

  try {
    const response = await fetch(registryUrl);
    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const nodeId = process.env.NODE_ID;

    // Filter out self and offline nodes
    registryCache = (data.nodes || [])
      .filter((n: PeerNode) => n.node_id !== nodeId)
      .map((n: PeerNode) => ({
        ...n,
        status: n.agent_endpoint ? 'unknown' : 'offline',
      }));

    registryCacheTime = Date.now();
    return registryCache;
  } catch (error) {
    console.error('Failed to fetch registry:', error);
    return registryCache || [];
  }
}

function selectPeers(
  peers: PeerNode[],
  query: string,
  maxPeers: number
): PeerNode[] {
  // Simple selection based on having an endpoint
  // In production, would use the full scoring algorithm
  return peers
    .filter((p) => p.agent_endpoint && p.status !== 'offline')
    .slice(0, maxPeers);
}

async function queryPeer(
  peer: PeerNode,
  query: string,
  useBridges: boolean,
  timeoutMs: number
): Promise<FederatedResult | null> {
  if (!peer.agent_endpoint) {
    return null;
  }

  const nodeId = process.env.NODE_ID;
  const queryId = `${nodeId}-${Date.now()}`;

  // Find bridge if available
  let bridge_used: string | undefined;
  let translated_query = query;
  const translations_applied: Array<{ original: string; translated: string }> =
    [];

  if (useBridges && peer.bridges && peer.bridges.length > 0) {
    // Would use bridge-translator skill here
    bridge_used = peer.bridges[0];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${peer.agent_endpoint}/federation/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_id: queryId,
        source_node_id: nodeId,
        query_text: query,
        translated_query_text: translated_query !== query ? translated_query : undefined,
        bridge_id: bridge_used,
        max_response_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      node_id: peer.node_id,
      node_name: peer.display_name,
      response: data.response_text,
      confidence: data.confidence,
      sources: data.source_documents || [],
      bridge_used,
      translations_applied:
        translations_applied.length > 0 ? translations_applied : undefined,
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function synthesizeResponse(
  query: string,
  localResults: unknown[],
  federatedResults: FederatedResult[]
): string {
  if (federatedResults.length === 0) {
    return 'No federated results available.';
  }

  const parts: string[] = [];

  if (localResults.length > 0) {
    parts.push('From local knowledge:');
    // Would format local results
  }

  for (const result of federatedResults) {
    parts.push(
      `\nFrom ${result.node_name} (confidence: ${Math.round(result.confidence * 100)}%):`
    );
    parts.push(result.response);
  }

  return parts.join('\n');
}

function generateAttribution(
  nodeId: string,
  federatedResults: FederatedResult[]
): string {
  const sources = [`${nodeId} (local)`];
  for (const result of federatedResults) {
    sources.push(`${result.node_name} (federated)`);
  }
  return `Sources: ${sources.join(', ')}`;
}

async function updateStats(type: 'query_sent' | 'query_received', count: number): Promise<void> {
  const statsPath = '/workspace/memory/federation-stats.json';
  let stats: FederationStats;

  try {
    const content = await fs.readFile(statsPath, 'utf-8');
    stats = JSON.parse(content);
  } catch {
    stats = {
      queries_sent: 0,
      queries_received: 0,
      avg_response_time_ms: 0,
      most_queried_peers: [],
      most_used_bridges: [],
    };
  }

  if (type === 'query_sent') {
    stats.queries_sent += count;
  } else {
    stats.queries_received += count;
  }

  await fs.mkdir('/workspace/memory', { recursive: true });
  await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
}

// Export all tools
export const tools = {
  federated_query,
  list_peers,
  receive_query,
  get_federation_stats,
};
