/**
 * vault-rag skill - Semantic search over bioregional knowledge vault
 *
 * This skill provides RAG (Retrieval-Augmented Generation) capabilities
 * for searching and retrieving content from the Obsidian vault.
 */

import { Pool } from 'pg';
import { chunk } from './chunk';
import { embed } from './embed';
import { SearchResult, VaultStats, IndexResult } from './types';

// Database connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.PGVECTOR_URL;
    if (!connectionString) {
      throw new Error('PGVECTOR_URL environment variable is required');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * Search the knowledge vault using semantic similarity
 */
export async function search_vault(params: {
  query: string;
  limit?: number;
  threshold?: number;
}): Promise<{ results: SearchResult[]; query: string; total_found: number }> {
  const { query, limit = 5, threshold = 0.7 } = params;
  const nodeId = process.env.NODE_ID;

  if (!nodeId) {
    throw new Error('NODE_ID environment variable is required');
  }

  // Generate embedding for query
  const queryEmbedding = await embed(query);

  // Search using pgvector
  const db = getPool();
  const result = await db.query(
    `SELECT * FROM search_vault($1, $2, $3, $4)`,
    [nodeId, JSON.stringify(queryEmbedding), limit, threshold]
  );

  const results: SearchResult[] = result.rows.map((row) => ({
    file_path: row.file_path,
    chunk_index: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
    metadata: row.metadata || {},
  }));

  return {
    results,
    query,
    total_found: results.length,
  };
}

/**
 * Index or reindex a specific file from the vault
 */
export async function index_file(params: {
  file_path: string;
  content?: string;
  force?: boolean;
}): Promise<IndexResult> {
  const { file_path, content, force = false } = params;
  const nodeId = process.env.NODE_ID;

  if (!nodeId) {
    throw new Error('NODE_ID environment variable is required');
  }

  // Get file content from GitHub if not provided
  let fileContent = content;
  if (!fileContent) {
    fileContent = await fetchFileFromGitHub(file_path);
  }

  // Check if file has changed (using hash)
  const contentHash = await hashContent(fileContent);
  const db = getPool();

  if (!force) {
    const existing = await db.query(
      `SELECT content_hash FROM vault_index_status WHERE node_id = $1 AND file_path = $2`,
      [nodeId, file_path]
    );

    if (existing.rows.length > 0 && existing.rows[0].content_hash === contentHash) {
      return {
        file_path,
        indexed: false,
        reason: 'Content unchanged',
        chunks: 0,
      };
    }
  }

  // Delete existing embeddings for this file
  await db.query(
    `SELECT delete_file_embeddings($1, $2)`,
    [nodeId, file_path]
  );

  // Chunk the content
  const chunks = chunk(fileContent, file_path);

  // Generate embeddings and insert
  for (const chunkData of chunks) {
    const embedding = await embed(chunkData.content);

    await db.query(
      `SELECT upsert_embedding($1, $2, $3, $4, $5, $6)`,
      [
        nodeId,
        file_path,
        chunkData.index,
        chunkData.content,
        JSON.stringify(embedding),
        JSON.stringify(chunkData.metadata),
      ]
    );
  }

  // Update index status
  await db.query(
    `INSERT INTO vault_index_status (node_id, file_path, content_hash, chunk_count)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (node_id, file_path)
     DO UPDATE SET content_hash = $3, chunk_count = $4, indexed_at = NOW()`,
    [nodeId, file_path, contentHash, chunks.length]
  );

  return {
    file_path,
    indexed: true,
    chunks: chunks.length,
  };
}

/**
 * Trigger a full vault reindex
 */
export async function index_vault(params: {
  changed_only?: boolean;
}): Promise<{ files_indexed: number; total_chunks: number; duration_ms: number }> {
  const { changed_only = true } = params;
  const startTime = Date.now();

  // Get list of markdown files from GitHub
  const files = await listVaultFiles();

  let filesIndexed = 0;
  let totalChunks = 0;

  for (const file of files) {
    try {
      const result = await index_file({
        file_path: file.path,
        content: file.content,
        force: !changed_only,
      });

      if (result.indexed) {
        filesIndexed++;
        totalChunks += result.chunks;
      }
    } catch (error) {
      console.error(`Error indexing ${file.path}:`, error);
    }
  }

  return {
    files_indexed: filesIndexed,
    total_chunks: totalChunks,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Get statistics about the indexed vault
 */
export async function vault_stats(): Promise<VaultStats> {
  const nodeId = process.env.NODE_ID;
  if (!nodeId) {
    throw new Error('NODE_ID environment variable is required');
  }

  const db = getPool();

  // Get total counts
  const counts = await db.query(
    `SELECT
       COUNT(DISTINCT file_path) as total_files,
       COUNT(*) as total_chunks,
       MAX(updated_at) as last_indexed
     FROM vault_embeddings
     WHERE node_id = $1`,
    [nodeId]
  );

  // Get top directories
  const directories = await db.query(
    `SELECT
       SPLIT_PART(file_path, '/', 1) as directory,
       COUNT(*) as chunks
     FROM vault_embeddings
     WHERE node_id = $1
     GROUP BY SPLIT_PART(file_path, '/', 1)
     ORDER BY chunks DESC
     LIMIT 10`,
    [nodeId]
  );

  return {
    total_files: parseInt(counts.rows[0]?.total_files || '0'),
    total_chunks: parseInt(counts.rows[0]?.total_chunks || '0'),
    last_indexed: counts.rows[0]?.last_indexed || null,
    top_directories: directories.rows.map((row) => ({
      path: row.directory + '/',
      chunks: parseInt(row.chunks),
    })),
  };
}

// Helper functions

async function fetchFileFromGitHub(filePath: string): Promise<string> {
  const repo = process.env.GITHUB_REPO;
  if (!repo) {
    throw new Error('GITHUB_REPO environment variable is required');
  }

  // Extract owner/repo from URL
  const match = repo.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GITHUB_REPO format');
  }

  const [, owner, repoName] = match;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3.raw',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
  }

  return response.text();
}

async function listVaultFiles(): Promise<Array<{ path: string; content: string }>> {
  const repo = process.env.GITHUB_REPO;
  if (!repo) {
    throw new Error('GITHUB_REPO environment variable is required');
  }

  // Extract owner/repo from URL
  const match = repo.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GITHUB_REPO format');
  }

  const [, owner, repoName] = match;

  // Get repository tree
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.status}`);
  }

  const data = await response.json();
  const mdFiles = data.tree.filter(
    (item: { type: string; path: string }) =>
      item.type === 'blob' && item.path.endsWith('.md')
  );

  // Fetch content for each file
  const files = await Promise.all(
    mdFiles.map(async (file: { path: string }) => ({
      path: file.path,
      content: await fetchFileFromGitHub(file.path),
    }))
  );

  return files;
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Export all tools
export const tools = {
  search_vault,
  index_file,
  index_vault,
  vault_stats,
};
