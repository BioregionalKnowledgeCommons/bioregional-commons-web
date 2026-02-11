# vault-rag Skill

Semantic search and retrieval over the bioregional knowledge vault.

## Purpose

This skill enables the agent to search the Obsidian vault using vector similarity, providing accurate answers grounded in the community's documented knowledge.

## Tools

### `search_vault`

Search the knowledge vault using semantic similarity.

**Parameters:**
- `query` (string, required): The search query
- `limit` (number, optional): Maximum results to return (default: 5)
- `threshold` (number, optional): Minimum similarity score 0-1 (default: 0.7)

**Returns:**
```json
{
  "results": [
    {
      "file_path": "governance/water-rights.md",
      "chunk_index": 2,
      "content": "...",
      "similarity": 0.89,
      "metadata": { "heading": "Prior Appropriation Doctrine" }
    }
  ],
  "query": "water rights",
  "total_found": 3
}
```

### `index_file`

Index or reindex a specific file from the vault.

**Parameters:**
- `file_path` (string, required): Path to the markdown file in the vault
- `force` (boolean, optional): Force reindex even if content unchanged

### `index_vault`

Trigger a full vault reindex.

**Parameters:**
- `changed_only` (boolean, optional): Only index files that changed since last index

### `vault_stats`

Get statistics about the indexed vault.

**Returns:**
```json
{
  "total_files": 47,
  "total_chunks": 312,
  "last_indexed": "2024-02-10T15:30:00Z",
  "top_directories": [
    { "path": "governance/", "chunks": 89 },
    { "path": "ecology/", "chunks": 76 }
  ]
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      vault-rag Skill                             │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Chunker    │───►│   Embedder   │───►│    pgvector      │  │
│  │  (by heading)│    │ (OpenAI API) │    │  (PostgreSQL)    │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         ▲                                         │              │
│         │                                         │              │
│  ┌──────┴───────┐                        ┌───────▼───────┐      │
│  │ GitHub Vault │                        │ search_vault  │      │
│  │   (.md files)│                        │   (tool)      │      │
│  └──────────────┘                        └───────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

Environment variables:
- `PGVECTOR_URL`: PostgreSQL connection string with pgvector
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`: For embedding generation
- `GITHUB_REPO`: Source vault repository

## Chunking Strategy

1. Split by markdown headings (h1, h2, h3)
2. Target chunk size: 500-1000 tokens
3. Preserve heading hierarchy in metadata
4. Include file path context

## Citation Format

When using search results, always cite sources:

```markdown
According to the Water Rights Framework (governance/water-rights.md#prior-appropriation):
> "Prior appropriation follows the 'first in time, first in right' principle..."
```
