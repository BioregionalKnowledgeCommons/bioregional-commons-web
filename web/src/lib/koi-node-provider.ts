// Server-only — KOI implementation of the NodeProvider interface.
import "server-only";

import { bffFetch, BffUpstreamError } from "./bff-fetch.server";
import type {
  NodeProvider,
  NodeHealth,
  EntitySummary,
  EntityDetail,
  SearchResult,
  Relationship,
} from "./node-provider";

export class KoiNodeProvider implements NodeProvider {
  readonly nodeId: string;
  private readonly baseUrl: string;

  constructor(nodeId: string, baseUrl: string) {
    this.nodeId = nodeId;
    this.baseUrl = baseUrl;
  }

  async health(): Promise<NodeHealth> {
    // /health returns {status, database, mode, entity_types, schema_version, ...}
    // Entity count comes from /stats, not /health. Fetch both in parallel.
    const [healthRaw, statsRaw] = await Promise.all([
      bffFetch(this.nodeId, "/health") as Promise<Record<string, unknown>>,
      bffFetch(this.nodeId, "/stats").catch(() => null) as Promise<Record<string, unknown> | null>,
    ]);

    // /stats returns {total_entities: N, by_type: {...}} when available
    const entityCount = statsRaw
      ? (statsRaw.total_entities as number) ?? 0
      : 0;

    return {
      status: (healthRaw.status as string) ?? "unknown",
      entities: entityCount,
      node_name: (healthRaw.node_name as string | undefined) ?? this.nodeId,
      version: (healthRaw.schema_version as string | undefined),
    };
  }

  async entities(
    options: { typeFilter?: string; limit?: number; offset?: number } = {}
  ): Promise<EntitySummary[]> {
    const qs = new URLSearchParams();
    if (options.typeFilter) qs.set("entity_type", options.typeFilter);
    qs.set("limit", String(options.limit ?? 50));
    qs.set("offset", String(options.offset ?? 0));

    const raw = (await bffFetch(
      this.nodeId,
      `/entities?${qs.toString()}`
    )) as { entities?: Array<Record<string, unknown>> };

    return (raw.entities ?? []).map((e) => ({
      uri: (e.fuseki_uri ?? e.uri) as string,
      label: ((e.entity_text ?? e.label) as string) ?? "",
      type: (e.entity_type as string) ?? "",
      description:
        e.metadata && typeof e.metadata === "object"
          ? ((e.metadata as Record<string, unknown>).description as
              | string
              | undefined)
          : undefined,
      koi_rid: e.koi_rid as string | undefined,
    }));
  }

  async entity(uri: string): Promise<EntityDetail> {
    const encoded = encodeURIComponent(uri);

    // Fetch entity detail, relationships, and mentioned-in in parallel
    const [entityRaw, relsRaw, mentionedRaw] = await Promise.all([
      bffFetch(this.nodeId, `/entity/${encoded}`) as Promise<{
        entity?: Record<string, unknown>;
        documents?: unknown[];
        detail?: string;
      }>,
      this.fetchRelationshipsSafe(uri),
      this.fetchMentionedInSafe(uri),
    ]);

    if (entityRaw.detail === "Entity not found" || !entityRaw.entity) {
      throw new BffUpstreamError(404);
    }

    const e = entityRaw.entity;
    return {
      uri: (e.fuseki_uri ?? e.uri) as string,
      label: ((e.entity_text ?? e.label) as string) ?? "",
      type: (e.entity_type as string) ?? "",
      description:
        e.metadata && typeof e.metadata === "object"
          ? ((e.metadata as Record<string, unknown>).description as
              | string
              | undefined)
          : undefined,
      koi_rid: e.koi_rid as string | undefined,
      created_at: e.created_at as string | undefined,
      relationships: relsRaw,
      mentioned_in: mentionedRaw,
    };
  }

  async search(
    query: string,
    options: { limit?: number } = {}
  ): Promise<SearchResult[]> {
    const qs = new URLSearchParams();
    qs.set("query", query.trim());
    if (options.limit) qs.set("limit", String(options.limit));

    const raw = (await bffFetch(
      this.nodeId,
      `/entity-search?${qs.toString()}`
    )) as { results?: Array<Record<string, unknown>> };

    return (raw.results ?? []).map((r) => ({
      uri: (r.uri ?? r.fuseki_uri) as string,
      label: ((r.name ?? r.label) as string) ?? "",
      type: ((r.type ?? r.entity_type) as string) ?? "",
      score: (r.similarity ?? r.score ?? 0) as number,
      snippet: r.description as string | undefined,
    }));
  }

  async relationships(entityUri: string): Promise<Relationship[]> {
    return this.fetchRelationshipsSafe(entityUri);
  }

  // ── Private helpers ──────────────────────────────────────────

  private async fetchRelationshipsSafe(uri: string): Promise<Relationship[]> {
    try {
      const raw = (await bffFetch(
        this.nodeId,
        `/relationships/${encodeURIComponent(uri)}`
      )) as { relationships?: Array<Record<string, unknown>> };

      return (raw.relationships ?? []).map((r) => ({
        subject_uri: r.subject_uri as string,
        predicate: r.predicate as string,
        object_uri: r.object_uri as string,
        subject_label: ((r.subject_name ?? r.subject_label) as string) ?? undefined,
        object_label: ((r.object_name ?? r.object_label) as string) ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  private async fetchMentionedInSafe(uri: string): Promise<string[]> {
    try {
      const raw = (await bffFetch(
        this.nodeId,
        `/entity/${encodeURIComponent(uri)}/mentioned-in`
      )) as { documents?: Array<Record<string, unknown>> } | unknown[];

      // The endpoint may return an array directly or { documents: [...] }
      const docs = Array.isArray(raw) ? raw : ((raw as Record<string, unknown>).documents as unknown[]) ?? [];
      return docs.map((d) =>
        typeof d === "string" ? d : ((d as Record<string, unknown>).title as string) ?? ""
      ).filter(Boolean);
    } catch {
      return [];
    }
  }
}
