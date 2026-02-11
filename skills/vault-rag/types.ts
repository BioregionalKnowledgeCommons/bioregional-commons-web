/**
 * Type definitions for vault-rag skill
 */

export interface SearchResult {
  file_path: string;
  chunk_index: number;
  content: string;
  similarity: number;
  metadata: {
    heading?: string;
    headingLevel?: number;
    headingPath?: string[];
    startLine?: number;
    endLine?: number;
    [key: string]: unknown;
  };
}

export interface IndexResult {
  file_path: string;
  indexed: boolean;
  chunks: number;
  reason?: string;
}

export interface VaultStats {
  total_files: number;
  total_chunks: number;
  last_indexed: string | null;
  top_directories: Array<{
    path: string;
    chunks: number;
  }>;
}

export interface ChunkMetadata {
  heading?: string;
  headingLevel?: number;
  headingPath?: string[];
  startLine?: number;
  endLine?: number;
  frontmatter?: Record<string, unknown>;
}

export interface VaultFile {
  path: string;
  content: string;
  sha?: string;
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
  apiKey: string;
  baseUrl?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    directory?: string;
    heading?: string;
    dateAfter?: string;
    dateBefore?: string;
  };
}

export interface IndexOptions {
  force?: boolean;
  changedOnly?: boolean;
  directories?: string[];
  excludePatterns?: string[];
}
