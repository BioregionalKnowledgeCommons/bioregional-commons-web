-- Initialize OpenCivics Bioregional Commons Database
-- This schema supports the vault-rag skill for semantic search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema for vault embeddings
-- Each node gets its own schema for isolation
CREATE TABLE IF NOT EXISTS vault_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, file_path, chunk_index)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_embeddings_node ON vault_embeddings(node_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_file ON vault_embeddings(file_path);
CREATE INDEX IF NOT EXISTS idx_embeddings_created ON vault_embeddings(created_at);

-- IVFFlat index for fast similarity search
-- Lists = sqrt(n) where n is expected row count, 100 is good for up to 10k chunks per node
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON vault_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Function to search similar chunks
CREATE OR REPLACE FUNCTION search_vault(
    p_node_id VARCHAR(255),
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 5,
    p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    file_path VARCHAR(500),
    chunk_index INTEGER,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ve.id,
        ve.file_path,
        ve.chunk_index,
        ve.content,
        ve.metadata,
        (1 - (ve.embedding <=> p_query_embedding))::FLOAT AS similarity
    FROM vault_embeddings ve
    WHERE ve.node_id = p_node_id
      AND (1 - (ve.embedding <=> p_query_embedding)) >= p_threshold
    ORDER BY ve.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert embeddings (update or insert)
CREATE OR REPLACE FUNCTION upsert_embedding(
    p_node_id VARCHAR(255),
    p_file_path VARCHAR(500),
    p_chunk_index INTEGER,
    p_content TEXT,
    p_embedding vector(1536),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO vault_embeddings (node_id, file_path, chunk_index, content, embedding, metadata)
    VALUES (p_node_id, p_file_path, p_chunk_index, p_content, p_embedding, p_metadata)
    ON CONFLICT (node_id, file_path, chunk_index)
    DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to delete all embeddings for a file (used when file is deleted or fully reindexed)
CREATE OR REPLACE FUNCTION delete_file_embeddings(
    p_node_id VARCHAR(255),
    p_file_path VARCHAR(500)
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM vault_embeddings
    WHERE node_id = p_node_id AND file_path = p_file_path;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Registry for tracking indexed files and their hashes
CREATE TABLE IF NOT EXISTS vault_index_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,  -- SHA-256 of file content
    chunk_count INTEGER NOT NULL,
    indexed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_index_status_node ON vault_index_status(node_id);

-- Grant access (adjust as needed for your security model)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO opencivics;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO opencivics;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO opencivics;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'OpenCivics Bioregional Commons database initialized successfully';
END $$;
