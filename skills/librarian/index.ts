/**
 * librarian skill - Knowledge ingestion and vault organization
 *
 * Helps the agent accept content from conversations, categorize it,
 * and integrate it into the vault structure.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

interface VaultSchema {
  directories: Record<
    string,
    {
      description: string;
      subdirectories?: string[];
    }
  >;
  tags: string[];
  conventions: {
    file_naming: string;
    require_frontmatter: boolean;
    require_tags: boolean;
    max_heading_depth?: number;
  };
}

interface CategoryResult {
  primary_category: string;
  subcategory?: string;
  suggested_path: string;
  confidence: number;
  alternative_categories: Array<{ category: string; confidence: number }>;
}

// Load vault schema
async function loadVaultSchema(): Promise<VaultSchema | null> {
  const schemaPath =
    process.env.VAULT_SCHEMA_PATH || '/workspace/vault/schema.yaml';
  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    return yaml.parse(content) as VaultSchema;
  } catch {
    return null;
  }
}

// Keywords for category detection
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  governance: [
    'policy',
    'law',
    'regulation',
    'agreement',
    'compact',
    'treaty',
    'rights',
    'governance',
    'jurisdiction',
    'authority',
    'decision',
    'vote',
    'council',
    'board',
  ],
  ecology: [
    'species',
    'habitat',
    'ecosystem',
    'watershed',
    'river',
    'forest',
    'wildlife',
    'biodiversity',
    'conservation',
    'restoration',
    'climate',
    'water',
    'soil',
    'flora',
    'fauna',
  ],
  practice: [
    'method',
    'technique',
    'process',
    'procedure',
    'guide',
    'how-to',
    'protocol',
    'best practice',
    'standard',
    'workflow',
  ],
  community: [
    'people',
    'community',
    'organization',
    'group',
    'network',
    'member',
    'stakeholder',
    'participant',
    'volunteer',
    'steward',
  ],
  cultural: [
    'tradition',
    'heritage',
    'indigenous',
    'native',
    'ceremony',
    'story',
    'history',
    'knowledge',
    'wisdom',
    'practice',
  ],
};

/**
 * Accept content from a conversation and prepare it for the vault
 */
export async function ingest_content(params: {
  topic: string;
  content: string;
  source?: string;
  suggested_path?: string;
  tags?: string[];
}): Promise<{
  file_path: string;
  content_preview: string;
  category: string;
  tags: string[];
  ready_to_commit: boolean;
  full_content: string;
}> {
  const { topic, content, source, suggested_path, tags = [] } = params;

  // Categorize the content
  const categoryResult = await categorize_page({ content, title: topic });

  // Generate file path
  const filePath =
    suggested_path ||
    `${categoryResult.primary_category}/${toKebabCase(topic)}.md`;

  // Extract or suggest tags
  const allTags = [...new Set([...tags, ...extractTags(content)])];

  // Generate frontmatter
  const frontmatter = {
    title: topic,
    created: new Date().toISOString().split('T')[0],
    updated: new Date().toISOString().split('T')[0],
    author: source || 'contributed-via-agent',
    tags: allTags,
    status: 'draft',
  };

  // Process content with link suggestions
  const processedContent = suggestLinks(content);

  // Build full page content
  const fullContent = `---
${yaml.stringify(frontmatter)}---

# ${topic}

${processedContent}

---
*Contributed via Bioregional Agent${source ? ` from ${source}` : ''}*
`;

  return {
    file_path: filePath,
    content_preview: processedContent.slice(0, 200) + '...',
    category: categoryResult.primary_category,
    tags: allTags,
    ready_to_commit: true,
    full_content: fullContent,
  };
}

/**
 * Auto-categorize content based on the vault's schema
 */
export async function categorize_page(params: {
  content: string;
  title?: string;
}): Promise<CategoryResult> {
  const { content, title = '' } = params;
  const schema = await loadVaultSchema();

  const textToAnalyze = `${title} ${content}`.toLowerCase();
  const scores: Record<string, number> = {};

  // Score each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textToAnalyze.match(regex);
      score += matches ? matches.length : 0;
    }
    scores[category] = score;
  }

  // Sort categories by score
  const sorted = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    // Default to practice if no matches
    return {
      primary_category: process.env.DEFAULT_CATEGORY || 'practice',
      suggested_path: `practice/${toKebabCase(title || 'untitled')}.md`,
      confidence: 0.3,
      alternative_categories: [],
    };
  }

  const totalScore = sorted.reduce((sum, [, score]) => sum + score, 0);
  const primaryCategory = sorted[0][0];
  const primaryConfidence = sorted[0][1] / totalScore;

  // Check for subcategory from schema
  let subcategory: string | undefined;
  if (schema?.directories[primaryCategory]?.subdirectories) {
    // Could implement more sophisticated subcategory detection
  }

  return {
    primary_category: primaryCategory,
    subcategory,
    suggested_path: `${primaryCategory}/${toKebabCase(title || 'untitled')}.md`,
    confidence: primaryConfidence,
    alternative_categories: sorted.slice(1, 4).map(([cat, score]) => ({
      category: cat,
      confidence: score / totalScore,
    })),
  };
}

/**
 * Analyze query patterns and suggest topics that should be documented
 */
export async function suggest_topics(params: {
  period_days?: number;
}): Promise<{
  suggested_topics: Array<{
    topic: string;
    query_count: number;
    existing_coverage: 'none' | 'partial' | 'good';
    suggested_action: string;
  }>;
}> {
  const { period_days = 30 } = params;

  // Load query log from memory
  const queryLogPath = '/workspace/memory/query-log.json';
  let queries: Array<{ query: string; timestamp: string }> = [];

  try {
    const content = await fs.readFile(queryLogPath, 'utf-8');
    queries = JSON.parse(content);
  } catch {
    // No query log yet
  }

  // Filter to period
  const cutoff = new Date(
    Date.now() - period_days * 24 * 60 * 60 * 1000
  ).toISOString();
  const recentQueries = queries.filter((q) => q.timestamp >= cutoff);

  // Count query topics (simplified - in production, would use NLP)
  const topicCounts: Record<string, number> = {};
  for (const { query } of recentQueries) {
    // Extract key phrases (very simplified)
    const words = query.toLowerCase().split(/\s+/);
    const phrases = words.filter(
      (w) => w.length > 4 && !STOP_WORDS.has(w)
    );
    for (const phrase of phrases) {
      topicCounts[phrase] = (topicCounts[phrase] || 0) + 1;
    }
  }

  // Sort by frequency
  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Check existing coverage (simplified)
  const suggestions = sortedTopics.map(([topic, count]) => ({
    topic,
    query_count: count,
    existing_coverage: 'partial' as const, // Would check vault in production
    suggested_action: `Consider adding more content about "${topic}"`,
  }));

  return { suggested_topics: suggestions };
}

/**
 * Get the vault's organizational schema
 */
export async function get_vault_schema(): Promise<{
  directories: Array<{
    path: string;
    description: string;
    file_count: number;
  }>;
  tags: string[];
  conventions: Record<string, unknown>;
}> {
  const schema = await loadVaultSchema();
  const vaultPath = '/workspace/vault';

  // Get directory file counts
  const directories: Array<{
    path: string;
    description: string;
    file_count: number;
  }> = [];

  if (schema?.directories) {
    for (const [dir, info] of Object.entries(schema.directories)) {
      let fileCount = 0;
      try {
        const files = await fs.readdir(path.join(vaultPath, dir), {
          recursive: true,
        });
        fileCount = files.filter((f) => f.endsWith('.md')).length;
      } catch {
        // Directory doesn't exist yet
      }

      directories.push({
        path: `${dir}/`,
        description: info.description,
        file_count: fileCount,
      });
    }
  } else {
    // Default schema if none exists
    const defaultDirs = ['governance', 'ecology', 'practice', 'community'];
    for (const dir of defaultDirs) {
      directories.push({
        path: `${dir}/`,
        description: `${dir.charAt(0).toUpperCase() + dir.slice(1)} content`,
        file_count: 0,
      });
    }
  }

  return {
    directories,
    tags: schema?.tags || [],
    conventions: schema?.conventions || {
      file_naming: 'kebab-case',
      require_frontmatter: true,
    },
  };
}

/**
 * Find related pages for a given topic
 */
export async function find_related(params: {
  topic: string;
  limit?: number;
}): Promise<{
  related_pages: Array<{
    path: string;
    relevance: number;
    section?: string;
  }>;
  suggested_links: string[];
}> {
  const { topic, limit = 5 } = params;

  // This would use vault-rag in production
  // For now, return a placeholder
  return {
    related_pages: [],
    suggested_links: [],
  };
}

// Helper functions

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractTags(content: string): string[] {
  const text = content.toLowerCase();
  const foundTags: string[] = [];

  // Check for common tag-worthy terms
  const tagPatterns = [
    'water',
    'policy',
    'species',
    'climate',
    'community',
    'governance',
    'restoration',
    'conservation',
    'agriculture',
    'watershed',
  ];

  for (const tag of tagPatterns) {
    if (text.includes(tag)) {
      foundTags.push(tag);
    }
  }

  return foundTags.slice(0, 5);
}

function suggestLinks(content: string): string {
  // Simplified link suggestion - would be more sophisticated in production
  const linkPatterns: Record<string, string> = {
    'Colorado River Compact': '[[colorado-river-compact]]',
    'prior appropriation': '[[water-rights#prior-appropriation]]',
    'watershed governance': '[[governance/watershed-governance]]',
  };

  let processed = content;
  for (const [pattern, link] of Object.entries(linkPatterns)) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    if (regex.test(processed) && !processed.includes(`[[${pattern}`)) {
      processed = processed.replace(regex, link);
    }
  }

  return processed;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'has',
  'have',
  'been',
  'would',
  'could',
  'about',
  'which',
  'their',
  'there',
  'these',
  'from',
  'with',
  'this',
  'that',
  'what',
  'when',
  'where',
  'will',
]);

// Export all tools
export const tools = {
  ingest_content,
  categorize_page,
  suggest_topics,
  get_vault_schema,
  find_related,
};
