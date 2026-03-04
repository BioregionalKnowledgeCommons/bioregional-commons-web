/**
 * Roadmap Query DSL — type definitions, validation, and NL→DSL translation.
 */

// ---------------------------------------------------------------------------
// DSL type definitions
// ---------------------------------------------------------------------------

export interface RoadmapDSL {
  operation: 'filter' | 'walk' | 'path' | 'stats';
  params: Record<string, unknown>;
}

const VALID_OPERATIONS = new Set(['filter', 'walk', 'path', 'stats']);

const VALID_STATUSES = new Set([
  'planned', 'in_progress', 'done', 'blocked', 'deprecated',
]);
const VALID_KINDS = new Set([
  'outcome', 'initiative', 'work_item', 'decision', 'risk', 'milestone', 'metric',
]);
const VALID_HORIZONS = new Set([
  'historical', '0-30d', '30-90d', '90-180d', '180-365d',
]);
const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3']);
const VALID_EDGE_TYPES = new Set([
  'delivers', 'depends_on', 'mitigates', 'measures', 'informs', 'blocks', 'references',
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateDSL(dsl: unknown): { valid: true; dsl: RoadmapDSL } | { valid: false; error: string } {
  if (!dsl || typeof dsl !== 'object') {
    return { valid: false, error: 'DSL must be an object' };
  }

  const d = dsl as Record<string, unknown>;

  if (!VALID_OPERATIONS.has(d.operation as string)) {
    return { valid: false, error: `Invalid operation: ${d.operation}` };
  }

  if (d.params && typeof d.params !== 'object') {
    return { valid: false, error: 'params must be an object' };
  }

  const params = (d.params ?? {}) as Record<string, unknown>;

  // Validate enum values if present
  if (params.status && !VALID_STATUSES.has(params.status as string)) {
    return { valid: false, error: `Invalid status: ${params.status}` };
  }
  if (params.kind && !VALID_KINDS.has(params.kind as string)) {
    return { valid: false, error: `Invalid kind: ${params.kind}` };
  }
  if (params.horizon && !VALID_HORIZONS.has(params.horizon as string)) {
    return { valid: false, error: `Invalid horizon: ${params.horizon}` };
  }
  if (params.priority && !VALID_PRIORITIES.has(params.priority as string)) {
    return { valid: false, error: `Invalid priority: ${params.priority}` };
  }
  if (params.edge_type && !VALID_EDGE_TYPES.has(params.edge_type as string)) {
    return { valid: false, error: `Invalid edge_type: ${params.edge_type}` };
  }
  if (params.direction && params.direction !== 'forward' && params.direction !== 'backward') {
    return { valid: false, error: `Invalid direction: ${params.direction}` };
  }

  // Operation-specific required params
  if (d.operation === 'walk' && !params.from) {
    return { valid: false, error: 'walk operation requires "from" param' };
  }
  if (d.operation === 'path' && (!params.from || !params.to)) {
    return { valid: false, error: 'path operation requires "from" and "to" params' };
  }

  return { valid: true, dsl: { operation: d.operation as RoadmapDSL['operation'], params } };
}

// ---------------------------------------------------------------------------
// Intent detection (keyword heuristic)
// ---------------------------------------------------------------------------

const ROADMAP_KEYWORDS = [
  'roadmap', 'critical path', 'milestone', 'horizon', 'initiative',
  'work item', 'work_item', 'shipping', 'what\'s done', 'what is done',
  'what\'s planned', 'what is planned', 'what\'s blocked', 'what is blocked',
  'next 30 days', 'next 90 days', 'in progress', 'deliverables',
  'depends on', 'delivers', 'outcome', 'priority', 'P0', 'P1',
  'what\'s next', 'what is next', 'sprint', 'what are we working on',
  'status of', 'roadmap stats', 'how many',
];

export function detectRoadmapIntent(query: string): boolean {
  const lower = query.toLowerCase();
  return ROADMAP_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

// ---------------------------------------------------------------------------
// NL → DSL translation prompt
// ---------------------------------------------------------------------------

export const NL_TO_DSL_SYSTEM_PROMPT = `You are a query translator. Convert natural language questions about a project roadmap into a structured JSON DSL.

The roadmap has nodes (outcome, initiative, work_item, decision, risk, milestone, metric) connected by edges (delivers, depends_on, mitigates, measures, informs, blocks, references).

Each node has: id, kind, title, summary, status (planned/in_progress/done/blocked/deprecated), priority (P0/P1/P2/P3), horizon (historical/0-30d/30-90d/90-180d/180-365d), owner, tags.

Valid tags (use ONLY these exact values): a2a, api, architecture, auth, bioregion, bounty, capital, chat, commitment-pooling, data, demo, deployment, ecology, economics, ecoregion, evaluation, evidence, federation, finance, foundation, governance, graphrag, grassroots-economics, ict4sd, infrastructure, ingest, integration, interop, koi-net, llm, mapping, mobile, ontology, operations, pilot, policy, protocol, quality, roadmap, security, seeding, sensing, sprint, supply-chain, sustainability, swarm, tbff, testing, tooling, visualization, watershed, web.

Node IDs use dot notation like: outcome.bioregional-swarm-live, work_item.c0-commitment-governance-extension, initiative.b1-commons-intake-pipeline

Output ONLY valid JSON matching this schema:
{
  "operation": "filter" | "walk" | "path" | "stats",
  "params": {
    // For "filter": status, kind, owner, horizon, priority, tags (array), search (substring match on title+summary), limit, offset
    // For "walk": from (node ID), direction ("forward" | "backward"), edge_type, max_depth
    // For "path": from (node ID), to (node ID), edge_types (array), max_depth
    // For "stats": no params needed
  }
}

IMPORTANT: For exploratory/topical queries like "what's related to X" or "show me items about Y", prefer using "search" (substring match on title and summary) over "tags". Use "tags" only when the user explicitly asks for a specific tag category. You can combine "search" with "tags" for precision.

Examples:
- "What's done?" → {"operation": "filter", "params": {"status": "done"}}
- "What's in progress?" → {"operation": "filter", "params": {"status": "in_progress"}}
- "Show P0 items" → {"operation": "filter", "params": {"priority": "P0"}}
- "What items are related to capital allocation / funding?" → {"operation": "filter", "params": {"tags": ["capital", "finance", "tbff"]}}
- "What's about commitment pooling?" → {"operation": "filter", "params": {"search": "commitment"}}
- "What's on the critical path to the bioregional swarm?" → {"operation": "walk", "params": {"from": "outcome.bioregional-swarm-live", "direction": "backward", "edge_type": "delivers"}}
- "What does the commitment pooling work deliver to?" → {"operation": "walk", "params": {"from": "work_item.c0-commitment-governance-extension", "direction": "forward", "edge_type": "delivers"}}
- "Roadmap stats" → {"operation": "stats", "params": {}}
- "What's shipping in the next 30 days?" → {"operation": "filter", "params": {"horizon": "0-30d", "status": "in_progress"}}
- "Show all milestones" → {"operation": "filter", "params": {"kind": "milestone"}}

Output ONLY the JSON, no explanation.`;

// ---------------------------------------------------------------------------
// NL → DSL via OpenAI
// ---------------------------------------------------------------------------

export async function translateNLtoDSL(
  query: string,
  apiKey: string,
): Promise<RoadmapDSL | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: NL_TO_DSL_SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Extract JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    const validation = validateDSL(parsed);

    return validation.valid ? validation.dsl : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Summarize structured results via OpenAI
// ---------------------------------------------------------------------------

export async function summarizeResults(
  query: string,
  results: unknown,
  apiKey: string,
  catalog?: string,
): Promise<string> {
  try {
    const resultsJson = JSON.stringify(results, null, 2);
    const resultCount = Array.isArray(results) ? results.length : null;
    const hasResults = resultCount === null || resultCount > 0;

    let systemContent = 'You are a helpful project assistant. Summarize the roadmap query results in clear, concise natural language. Use bullet points for lists. Reference specific items by title. Keep the response focused and actionable.';

    if (catalog) {
      systemContent += `\n\nYou also have access to a complete catalog of ALL roadmap nodes (id | title | summary | status | priority | horizon | tags), one per line. ${hasResults ? 'Use the DSL query results as your primary source, but consult the catalog to find additional relevant items the structured query may have missed.' : 'The structured query returned no results. Search the catalog below to find items relevant to the user\'s question and answer based on what you find.'}\n\n--- FULL ROADMAP CATALOG ---\n${catalog}\n--- END CATALOG ---`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          {
            role: 'user',
            content: `User question: ${query}\n\nRoadmap query results:\n${resultsJson}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      return `Found ${Array.isArray(results) ? results.length : 'N/A'} results. (Summarization unavailable)`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? 'No summary available.';
  } catch {
    return `Found results but summarization failed. Raw data available in sources.`;
  }
}
