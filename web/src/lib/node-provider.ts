// NodeProvider — framework-agnostic interface for querying a KOI node.
// Implementations live in separate files (e.g. koi-node-provider.ts).

export interface NodeHealth {
  status: string;
  entities: number;
  node_name?: string;
  version?: string;
}

export interface EntitySummary {
  uri: string;
  label: string;
  type: string;
  description?: string;
  koi_rid?: string;
}

export interface SearchResult {
  uri: string;
  label: string;
  type: string;
  score: number;
  snippet?: string;
}

export interface Relationship {
  subject_uri: string;
  predicate: string;
  object_uri: string;
  subject_label?: string;
  object_label?: string;
}

export interface EntityDetail extends EntitySummary {
  relationships: Relationship[];
  mentioned_in: string[];
  created_at?: string;
}

export interface NodeProvider {
  readonly nodeId: string;
  health(): Promise<NodeHealth>;
  entities(options?: {
    typeFilter?: string;
    limit?: number;
    offset?: number;
  }): Promise<EntitySummary[]>;
  entity(uri: string): Promise<EntityDetail>;
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;
  relationships(entityUri: string): Promise<Relationship[]>;
}
