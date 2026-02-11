/**
 * Embedding generation for vault-rag skill
 *
 * Generates vector embeddings for text using OpenAI or compatible APIs.
 * Dimension: 1536 (text-embedding-3-small)
 */

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

// Simple in-memory cache to reduce API calls for repeated queries
const embeddingCache = new Map<string, number[]>();
const CACHE_SIZE = 1000;

/**
 * Generate embedding vector for text
 */
export async function embed(text: string): Promise<number[]> {
  // Check cache first
  const cacheKey = text.slice(0, 500); // Use first 500 chars as key
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback: try to use Anthropic API with voyage embeddings or similar
    // For now, throw an error
    throw new Error('OPENAI_API_KEY is required for embeddings');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const embedding: number[] = data.data[0].embedding;

  // Validate dimension
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Unexpected embedding dimension: ${embedding.length} (expected ${EMBEDDING_DIMENSION})`
    );
  }

  // Cache the result
  if (embeddingCache.size >= CACHE_SIZE) {
    // Evict oldest entries (FIFO)
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  embeddingCache.set(cacheKey, embedding);

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embeddings');
  }

  // Check cache for each text
  const results: (number[] | null)[] = texts.map((text) => {
    const cacheKey = text.slice(0, 500);
    return embeddingCache.get(cacheKey) || null;
  });

  // Find texts that need embedding
  const uncached = texts
    .map((text, i) => ({ text, index: i }))
    .filter((_, i) => results[i] === null);

  if (uncached.length === 0) {
    return results as number[][];
  }

  // Batch API call for uncached texts
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: uncached.map((u) => u.text),
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Fill in results and update cache
  for (let i = 0; i < uncached.length; i++) {
    const embedding: number[] = data.data[i].embedding;
    const originalIndex = uncached[i].index;
    results[originalIndex] = embedding;

    // Cache
    const cacheKey = uncached[i].text.slice(0, 500);
    if (embeddingCache.size >= CACHE_SIZE) {
      const firstKey = embeddingCache.keys().next().value;
      embeddingCache.delete(firstKey);
    }
    embeddingCache.set(cacheKey, embedding);
  }

  return results as number[][];
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimensions must match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Clear the embedding cache
 */
export function clearCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: embeddingCache.size,
    maxSize: CACHE_SIZE,
  };
}
