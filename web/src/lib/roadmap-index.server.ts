/**
 * In-memory roadmap index with mtime-based cache invalidation.
 * Loaded once, shared across all roadmap API routes.
 */
import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { Roadmap, RoadmapNode, RoadmapEdge } from '@/components/roadmap/roadmap-types';

// ---------------------------------------------------------------------------
// Index structure
// ---------------------------------------------------------------------------

export interface RoadmapIndex {
  roadmap: Roadmap;
  nodeById: Map<string, RoadmapNode>;
  edgesByFrom: Map<string, RoadmapEdge[]>;
  edgesByTo: Map<string, RoadmapEdge[]>;
  nodesByStatus: Map<string, RoadmapNode[]>;
  nodesByKind: Map<string, RoadmapNode[]>;
  nodesByHorizon: Map<string, RoadmapNode[]>;
  nodesByOwner: Map<string, RoadmapNode[]>;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedIndex: RoadmapIndex | null = null;
let cachedMtime: number = 0;

function roadmapFilePath(): string {
  return join(process.cwd(), 'public', 'roadmap-data.json');
}

function buildIndex(roadmap: Roadmap): RoadmapIndex {
  const nodeById = new Map<string, RoadmapNode>();
  const edgesByFrom = new Map<string, RoadmapEdge[]>();
  const edgesByTo = new Map<string, RoadmapEdge[]>();
  const nodesByStatus = new Map<string, RoadmapNode[]>();
  const nodesByKind = new Map<string, RoadmapNode[]>();
  const nodesByHorizon = new Map<string, RoadmapNode[]>();
  const nodesByOwner = new Map<string, RoadmapNode[]>();

  for (const node of roadmap.nodes) {
    nodeById.set(node.id, node);

    const pushTo = (map: Map<string, RoadmapNode[]>, key: string | undefined) => {
      if (!key) return;
      const arr = map.get(key) ?? [];
      arr.push(node);
      map.set(key, arr);
    };

    pushTo(nodesByStatus, node.status);
    pushTo(nodesByKind, node.kind);
    pushTo(nodesByHorizon, node.horizon);
    pushTo(nodesByOwner, node.owner);
  }

  for (const edge of roadmap.edges) {
    const fromArr = edgesByFrom.get(edge.from) ?? [];
    fromArr.push(edge);
    edgesByFrom.set(edge.from, fromArr);

    const toArr = edgesByTo.get(edge.to) ?? [];
    toArr.push(edge);
    edgesByTo.set(edge.to, toArr);
  }

  return {
    roadmap,
    nodeById,
    edgesByFrom,
    edgesByTo,
    nodesByStatus,
    nodesByKind,
    nodesByHorizon,
    nodesByOwner,
  };
}

export function getRoadmapIndex(): RoadmapIndex {
  const filePath = roadmapFilePath();
  const mtime = statSync(filePath).mtimeMs;

  if (cachedIndex && mtime === cachedMtime) {
    return cachedIndex;
  }

  const raw = readFileSync(filePath, 'utf-8');
  const roadmap: Roadmap = JSON.parse(raw);
  cachedIndex = buildIndex(roadmap);
  cachedMtime = mtime;
  return cachedIndex;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export interface FilterParams {
  status?: string;
  kind?: string;
  owner?: string;
  horizon?: string;
  priority?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export function filterNodes(idx: RoadmapIndex, params: FilterParams): RoadmapNode[] {
  let nodes = idx.roadmap.nodes;

  if (params.status) {
    nodes = nodes.filter((n) => n.status === params.status);
  }
  if (params.kind) {
    nodes = nodes.filter((n) => n.kind === params.kind);
  }
  if (params.owner) {
    nodes = nodes.filter((n) => n.owner === params.owner);
  }
  if (params.horizon) {
    nodes = nodes.filter((n) => n.horizon === params.horizon);
  }
  if (params.priority) {
    nodes = nodes.filter((n) => n.priority === params.priority);
  }
  if (params.tags && params.tags.length > 0) {
    const tagSet = new Set(params.tags);
    nodes = nodes.filter((n) => n.tags?.some((t) => tagSet.has(t)));
  }
  if (params.search) {
    const term = params.search.toLowerCase();
    nodes = nodes.filter((n) => {
      const text = `${n.title ?? ''} ${n.summary ?? ''}`.toLowerCase();
      return text.includes(term);
    });
  }

  const offset = params.offset ?? 0;
  const limit = params.limit ?? nodes.length;
  return nodes.slice(offset, offset + limit);
}

// ---------------------------------------------------------------------------
// Path finding (BFS shortest path)
// ---------------------------------------------------------------------------

export interface PathResult {
  found: boolean;
  path: string[];
  edges: RoadmapEdge[];
}

export function findShortestPath(
  idx: RoadmapIndex,
  from: string,
  to: string,
  edgeTypes?: Set<string>,
  maxDepth: number = 6,
): PathResult {
  if (!idx.nodeById.has(from) || !idx.nodeById.has(to)) {
    return { found: false, path: [], edges: [] };
  }
  if (from === to) {
    return { found: true, path: [from], edges: [] };
  }

  maxDepth = Math.min(maxDepth, 10);

  // BFS
  const visited = new Set<string>([from]);
  const parent = new Map<string, { node: string; edge: RoadmapEdge }>();
  const queue: Array<{ node: string; depth: number }> = [{ node: from, depth: 0 }];

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    // Follow forward edges
    const forwardEdges = idx.edgesByFrom.get(node) ?? [];
    // Follow backward edges (treat graph as undirected for path finding)
    const backwardEdges = idx.edgesByTo.get(node) ?? [];

    const neighbors: Array<{ neighbor: string; edge: RoadmapEdge }> = [];
    for (const e of forwardEdges) {
      if (!edgeTypes || edgeTypes.has(e.type)) {
        neighbors.push({ neighbor: e.to, edge: e });
      }
    }
    for (const e of backwardEdges) {
      if (!edgeTypes || edgeTypes.has(e.type)) {
        neighbors.push({ neighbor: e.from, edge: e });
      }
    }

    for (const { neighbor, edge } of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, { node, edge });

      if (neighbor === to) {
        // Reconstruct path
        const path: string[] = [to];
        const edges: RoadmapEdge[] = [];
        let cur = to;
        while (parent.has(cur)) {
          const p = parent.get(cur)!;
          path.unshift(p.node);
          edges.unshift(p.edge);
          cur = p.node;
        }
        return { found: true, path, edges };
      }

      queue.push({ node: neighbor, depth: depth + 1 });
    }
  }

  return { found: false, path: [], edges: [] };
}

// ---------------------------------------------------------------------------
// Walk (directed subgraph traversal)
// ---------------------------------------------------------------------------

export interface WalkResult {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

export function walkGraph(
  idx: RoadmapIndex,
  from: string,
  direction: 'forward' | 'backward',
  edgeType?: string,
  maxDepth: number = 5,
): WalkResult {
  if (!idx.nodeById.has(from)) {
    return { nodes: [], edges: [] };
  }

  maxDepth = Math.min(maxDepth, 10);
  const visitedNodes = new Set<string>([from]);
  const collectedEdges: RoadmapEdge[] = [];
  const queue: Array<{ node: string; depth: number }> = [{ node: from, depth: 0 }];

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    const edgeMap = direction === 'forward' ? idx.edgesByFrom : idx.edgesByTo;
    const edges = edgeMap.get(node) ?? [];

    for (const e of edges) {
      if (edgeType && e.type !== edgeType) continue;

      const neighbor = direction === 'forward' ? e.to : e.from;
      collectedEdges.push(e);

      if (!visitedNodes.has(neighbor)) {
        visitedNodes.add(neighbor);
        queue.push({ node: neighbor, depth: depth + 1 });
      }
    }
  }

  const nodes = [...visitedNodes]
    .map((id) => idx.nodeById.get(id))
    .filter((n): n is RoadmapNode => !!n);

  return { nodes, edges: collectedEdges };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface RoadmapStats {
  total_nodes: number;
  total_edges: number;
  version: string;
  as_of: string;
  by_status: Record<string, number>;
  by_kind: Record<string, number>;
  by_horizon: Record<string, number>;
  by_owner: Record<string, number>;
}

export function computeStats(idx: RoadmapIndex): RoadmapStats {
  const count = (map: Map<string, RoadmapNode[]>) =>
    Object.fromEntries([...map.entries()].map(([k, v]) => [k, v.length]));

  return {
    total_nodes: idx.roadmap.nodes.length,
    total_edges: idx.roadmap.edges.length,
    version: idx.roadmap.version,
    as_of: idx.roadmap.as_of,
    by_status: count(idx.nodesByStatus),
    by_kind: count(idx.nodesByKind),
    by_horizon: count(idx.nodesByHorizon),
    by_owner: count(idx.nodesByOwner),
  };
}

// ---------------------------------------------------------------------------
// DSL execution (used by Phase 2 chat integration)
// ---------------------------------------------------------------------------

export interface RoadmapDSL {
  operation: 'filter' | 'walk' | 'path' | 'stats';
  params: Record<string, unknown>;
}

export function executeDSL(dsl: RoadmapDSL): unknown {
  const idx = getRoadmapIndex();
  const p = dsl.params;

  switch (dsl.operation) {
    case 'filter':
      return filterNodes(idx, {
        status: p.status as string | undefined,
        kind: p.kind as string | undefined,
        owner: p.owner as string | undefined,
        horizon: p.horizon as string | undefined,
        priority: p.priority as string | undefined,
        tags: p.tags as string[] | undefined,
        search: p.search as string | undefined,
        limit: p.limit as number | undefined,
        offset: p.offset as number | undefined,
      });

    case 'walk':
      return walkGraph(
        idx,
        p.from as string,
        (p.direction as 'forward' | 'backward') ?? 'forward',
        p.edge_type as string | undefined,
        (p.max_depth as number) ?? 5,
      );

    case 'path': {
      const pathResult = findShortestPath(
        idx,
        p.from as string,
        p.to as string,
        p.edge_types ? new Set(p.edge_types as string[]) : undefined,
        (p.max_depth as number) ?? 6,
      );
      // Enrich path string IDs to node objects for chat source extraction
      const pathNodes = pathResult.path
        .map((id) => idx.nodeById.get(id))
        .filter((n): n is RoadmapNode => !!n);
      return { found: pathResult.found, path: pathNodes, edges: pathResult.edges };
    }

    case 'stats':
      return computeStats(idx);

    default:
      throw new Error(`Unknown DSL operation: ${dsl.operation}`);
  }
}
