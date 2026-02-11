/**
 * bridge-translator skill - Schema bridge vocabulary translation
 *
 * Translates vocabulary between nodes with different schemas,
 * enabling meaningful federated queries across the bioregional network.
 */

import * as yaml from 'yaml';

interface VocabularyMapping {
  source_term: string;
  target_term: string;
  confidence: number;
  notes?: string;
}

interface StructureMapping {
  source_path: string;
  target_path: string;
}

interface TaxonomyMapping {
  name: string;
  mapping: Record<string, string>;
}

interface QueryPattern {
  source_pattern: string;
  target_pattern: string;
}

interface BridgeNode {
  node_id: string;
  display_name: string;
  schema_version: string;
}

interface Bridge {
  bridge_id: string;
  version: string;
  last_updated: string;
  nodes: {
    source: BridgeNode;
    target: BridgeNode;
  };
  vocabulary: VocabularyMapping[];
  structure?: StructureMapping[];
  taxonomies?: TaxonomyMapping[];
  query_translation?: QueryPattern[];
  bidirectional: boolean;
  maintainers: Array<{ github: string }>;
  review_schedule?: string;
}

interface TranslationResult {
  original: string;
  translated: string;
  confidence: number;
}

// Bridge cache
const bridgeCache: Map<string, { bridge: Bridge; fetchedAt: number }> =
  new Map();
const BRIDGE_CACHE_TTL = parseInt(process.env.BRIDGE_CACHE_TTL || '3600') * 1000;

/**
 * Translate a query using available bridges
 */
export async function translate_query(params: {
  query: string;
  source_node: string;
  target_node: string;
}): Promise<{
  original_query: string;
  translated_query: string;
  bridge_id: string | null;
  translations: TranslationResult[];
  confidence: number;
}> {
  const { query, source_node, target_node } = params;

  // Find appropriate bridge
  const bridge = await findBridge(source_node, target_node);

  if (!bridge) {
    return {
      original_query: query,
      translated_query: query,
      bridge_id: null,
      translations: [],
      confidence: 1.0, // No translation needed if no bridge
    };
  }

  // Apply translations
  const { translatedText, translations } = applyVocabularyTranslations(
    query,
    bridge.vocabulary,
    false
  );

  // Apply query patterns
  const patternTranslated = applyQueryPatterns(
    translatedText,
    bridge.query_translation || [],
    false
  );

  // Calculate overall confidence
  const confidence =
    translations.length > 0
      ? translations.reduce((sum, t) => sum + t.confidence, 0) /
        translations.length
      : 1.0;

  return {
    original_query: query,
    translated_query: patternTranslated,
    bridge_id: bridge.bridge_id,
    translations,
    confidence,
  };
}

/**
 * Translate a response back to source vocabulary
 */
export async function translate_response(params: {
  response: string;
  bridge_id: string;
  reverse?: boolean;
}): Promise<{
  original_response: string;
  translated_response: string;
  translations: TranslationResult[];
}> {
  const { response, bridge_id, reverse = true } = params;

  const bridge = await getBridgeById(bridge_id);

  if (!bridge) {
    return {
      original_response: response,
      translated_response: response,
      translations: [],
    };
  }

  // Apply reverse translations
  const { translatedText, translations } = applyVocabularyTranslations(
    response,
    bridge.vocabulary,
    reverse
  );

  return {
    original_response: response,
    translated_response: translatedText,
    translations,
  };
}

/**
 * List all available bridges, optionally filtered by node
 */
export async function list_bridges(params?: { node_id?: string }): Promise<{
  bridges: Array<{
    bridge_id: string;
    source_node: string;
    target_node: string;
    vocabulary_count: number;
    last_updated: string;
    bidirectional: boolean;
  }>;
}> {
  const { node_id } = params || {};

  const allBridges = await fetchBridgeIndex();

  let filtered = allBridges;
  if (node_id) {
    filtered = allBridges.filter(
      (b) =>
        b.nodes.source.node_id === node_id ||
        (b.bidirectional && b.nodes.target.node_id === node_id)
    );
  }

  return {
    bridges: filtered.map((b) => ({
      bridge_id: b.bridge_id,
      source_node: b.nodes.source.node_id,
      target_node: b.nodes.target.node_id,
      vocabulary_count: b.vocabulary.length,
      last_updated: b.last_updated,
      bidirectional: b.bidirectional,
    })),
  };
}

/**
 * Get details of a specific bridge
 */
export async function get_bridge(params: { bridge_id: string }): Promise<{
  bridge: Bridge | null;
  found: boolean;
}> {
  const bridge = await getBridgeById(params.bridge_id);
  return {
    bridge,
    found: bridge !== null,
  };
}

/**
 * Analyze two nodes and suggest bridge mappings
 */
export async function suggest_bridge(params: {
  source_node: string;
  target_node: string;
}): Promise<{
  suggested_mappings: Array<{
    source_term: string;
    target_term: string;
    confidence: number;
    reason: string;
  }>;
  schema_overlap: number;
  recommendation: string;
}> {
  const { source_node, target_node } = params;

  // Fetch schemas from both nodes (would call their manifest endpoints)
  const sourceSchema = await fetchNodeSchema(source_node);
  const targetSchema = await fetchNodeSchema(target_node);

  if (!sourceSchema || !targetSchema) {
    return {
      suggested_mappings: [],
      schema_overlap: 0,
      recommendation: 'Unable to fetch schemas from one or both nodes',
    };
  }

  // Analyze vocabulary overlap
  const suggestions = analyzeVocabularyOverlap(sourceSchema, targetSchema);

  // Calculate schema overlap
  const overlap = calculateSchemaOverlap(sourceSchema, targetSchema);

  // Generate recommendation
  let recommendation: string;
  if (overlap > 0.8) {
    recommendation = 'Schemas highly compatible, minimal bridge needed';
  } else if (overlap > 0.5) {
    recommendation = 'Bridge creation recommended';
  } else if (overlap > 0.3) {
    recommendation = 'Bridge creation strongly recommended';
  } else {
    recommendation =
      'Schemas significantly different, comprehensive bridge required';
  }

  return {
    suggested_mappings: suggestions,
    schema_overlap: overlap,
    recommendation,
  };
}

// Internal helper functions

async function findBridge(
  sourceNode: string,
  targetNode: string
): Promise<Bridge | null> {
  const allBridges = await fetchBridgeIndex();

  // Direct match
  const direct = allBridges.find(
    (b) =>
      b.nodes.source.node_id === sourceNode &&
      b.nodes.target.node_id === targetNode
  );

  if (direct) return direct;

  // Reverse match (if bidirectional)
  const reverse = allBridges.find(
    (b) =>
      b.bidirectional &&
      b.nodes.source.node_id === targetNode &&
      b.nodes.target.node_id === sourceNode
  );

  return reverse || null;
}

async function getBridgeById(bridgeId: string): Promise<Bridge | null> {
  // Check cache
  const cached = bridgeCache.get(bridgeId);
  if (cached && Date.now() - cached.fetchedAt < BRIDGE_CACHE_TTL) {
    return cached.bridge;
  }

  // Fetch from registry
  const registryUrl =
    process.env.REGISTRY_URL ||
    'https://raw.githubusercontent.com/opencivics/index-registry/main';

  try {
    const response = await fetch(`${registryUrl}/bridges/${bridgeId}.yaml`);
    if (!response.ok) {
      return null;
    }

    const content = await response.text();
    const bridge = yaml.parse(content) as Bridge;

    // Cache it
    bridgeCache.set(bridgeId, { bridge, fetchedAt: Date.now() });

    return bridge;
  } catch (error) {
    console.error(`Failed to fetch bridge ${bridgeId}:`, error);
    return null;
  }
}

async function fetchBridgeIndex(): Promise<Bridge[]> {
  const registryUrl =
    process.env.REGISTRY_URL ||
    'https://raw.githubusercontent.com/opencivics/index-registry/main';

  try {
    const response = await fetch(`${registryUrl}/bridges/index.json`);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.bridges || [];
  } catch (error) {
    console.error('Failed to fetch bridge index:', error);
    return [];
  }
}

function applyVocabularyTranslations(
  text: string,
  vocabulary: VocabularyMapping[],
  reverse: boolean
): { translatedText: string; translations: TranslationResult[] } {
  let translatedText = text;
  const translations: TranslationResult[] = [];

  for (const mapping of vocabulary) {
    const sourceText = reverse ? mapping.target_term : mapping.source_term;
    const targetText = reverse ? mapping.source_term : mapping.target_term;

    // Case-insensitive word boundary match
    const regex = new RegExp(`\\b${escapeRegex(sourceText)}\\b`, 'gi');

    if (regex.test(translatedText)) {
      translatedText = translatedText.replace(regex, targetText);
      translations.push({
        original: sourceText,
        translated: targetText,
        confidence: mapping.confidence,
      });
    }
  }

  return { translatedText, translations };
}

function applyQueryPatterns(
  text: string,
  patterns: QueryPattern[],
  reverse: boolean
): string {
  let result = text;

  for (const pattern of patterns) {
    const sourcePattern = reverse
      ? pattern.target_pattern
      : pattern.source_pattern;
    const targetPattern = reverse
      ? pattern.source_pattern
      : pattern.target_pattern;

    // Convert pattern to regex (simple placeholder replacement)
    const regexPattern = sourcePattern
      .replace(/\{(\w+)\}/g, '(?<$1>[^,]+)')
      .replace(/\s+/g, '\\s+');

    try {
      const regex = new RegExp(regexPattern, 'gi');
      result = result.replace(regex, (...args) => {
        const groups = args[args.length - 1];
        let output = targetPattern;
        for (const [key, value] of Object.entries(groups || {})) {
          output = output.replace(`{${key}}`, value as string);
        }
        return output;
      });
    } catch {
      // Invalid regex pattern, skip
    }
  }

  return result;
}

interface NodeSchema {
  terms: string[];
  categories: string[];
  structure: string[];
}

async function fetchNodeSchema(nodeId: string): Promise<NodeSchema | null> {
  // In production, would fetch from node's manifest endpoint
  // For now, return a mock schema based on node ID patterns
  const registryUrl =
    process.env.REGISTRY_URL ||
    'https://raw.githubusercontent.com/opencivics/index-registry/main';

  try {
    const response = await fetch(`${registryUrl}/nodes/${nodeId}/schema.json`);
    if (!response.ok) {
      // Return mock schema for development
      return {
        terms: ['water', 'governance', 'watershed', 'policy'],
        categories: ['ecology', 'governance', 'practice'],
        structure: ['docs/', 'data/', 'governance/'],
      };
    }

    return await response.json();
  } catch {
    return {
      terms: ['water', 'governance', 'watershed', 'policy'],
      categories: ['ecology', 'governance', 'practice'],
      structure: ['docs/', 'data/', 'governance/'],
    };
  }
}

function analyzeVocabularyOverlap(
  source: NodeSchema,
  target: NodeSchema
): Array<{
  source_term: string;
  target_term: string;
  confidence: number;
  reason: string;
}> {
  const suggestions: Array<{
    source_term: string;
    target_term: string;
    confidence: number;
    reason: string;
  }> = [];

  // Simple similarity analysis
  // In production, would use embeddings or NLP
  const synonymGroups: Record<string, string[]> = {
    water: ['water', 'aquatic', 'hydro', 'watershed', 'river'],
    governance: ['governance', 'policy', 'regulation', 'management', 'administration'],
    rights: ['rights', 'entitlements', 'allocations', 'appropriations'],
    ecology: ['ecology', 'ecosystem', 'environment', 'habitat'],
  };

  for (const sourceTerm of source.terms) {
    for (const targetTerm of target.terms) {
      if (sourceTerm === targetTerm) continue;

      // Check if they're in the same synonym group
      for (const [, synonyms] of Object.entries(synonymGroups)) {
        const sourceInGroup = synonyms.some((s) =>
          sourceTerm.toLowerCase().includes(s)
        );
        const targetInGroup = synonyms.some((s) =>
          targetTerm.toLowerCase().includes(s)
        );

        if (sourceInGroup && targetInGroup) {
          suggestions.push({
            source_term: sourceTerm,
            target_term: targetTerm,
            confidence: 0.75,
            reason: 'Related terms in similar semantic domain',
          });
          break;
        }
      }
    }
  }

  return suggestions.slice(0, 10); // Limit to top 10 suggestions
}

function calculateSchemaOverlap(
  source: NodeSchema,
  target: NodeSchema
): number {
  const sourceTerms = new Set(source.terms.map((t) => t.toLowerCase()));
  const targetTerms = new Set(target.terms.map((t) => t.toLowerCase()));

  let overlap = 0;
  for (const term of sourceTerms) {
    if (targetTerms.has(term)) {
      overlap++;
    }
  }

  const totalUnique = new Set([...sourceTerms, ...targetTerms]).size;
  return totalUnique > 0 ? overlap / totalUnique : 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export all tools
export const tools = {
  translate_query,
  translate_response,
  list_bridges,
  get_bridge,
  suggest_bridge,
};
